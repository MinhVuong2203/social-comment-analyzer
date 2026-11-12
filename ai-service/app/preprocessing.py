import os
import re
import json
import logging
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Tuple, Optional
try:
    from pyvi import ViTokenizer
except ImportError:
    class ViTokenizer:
        @staticmethod
        def tokenize(text: str) -> str:
            return text

from .config import (
    TEENCODE_JSON_PATH,
    TEENCODE_EXCEL_PATH,
    COLAB_EXCEL_PATH,
)

logger = logging.getLogger("ai_service.preprocessing")

# 1. Từ điển teencode dự phòng (khi không tìm thấy file json hoặc excel)
DEFAULT_TEENCODE_DICT: Dict[str, str] = {
    "ko": "không", "k": "không", "kh": "không", "hok": "không", "hong": "không",
    "dc": "được", "dk": "được", "đc": "được",
    "vs": "với", "j": "gì", "r": "rồi", "cx": "cũng",
    "thik": "thích", "thjx": "thích", "mik": "mình",
    "t": "tao", "m": "mày", "ae": "anh em",
    "ng": "người", "ntn": "như thế nào", "sao": "sao",
    "đt": "điện thoại", "fb": "facebook", "ib": "nhắn tin",
    "bt": "bình thường",
}

# Các biến lưu trữ toàn cục trong bộ nhớ
TEENCODE_SINGLE: Dict[str, str] = dict(DEFAULT_TEENCODE_DICT)
TEENCODE_MULTI: Dict[str, str] = {}
TEENCODE_MULTI_REGEX: Optional[re.Pattern] = None
TEENCODE_SOURCE: str = "default_fallback"


def _parse_xlsx_raw(file_path: Path):
    """
    Đọc dữ liệu bảng tính từ file .xlsx bằng chuẩn zipfile + ElementTree.
    Không phụ thuộc vào thư viện ngoài như openpyxl hay pandas.
    """
    with zipfile.ZipFile(file_path) as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                text_runs = [
                    r.text
                    for r in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                    if r.text
                ]
                shared_strings.append("".join(text_runs))

        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

        rows_data = []
        for row in sheet.iter(f"{ns}row"):
            row_dict = {}
            for c in row.iter(f"{ns}c"):
                r = c.attrib.get("r", "")
                m = re.match(r"([A-Z]+)", r)
                if not m:
                    continue
                col_letter = m.group(1)
                t = c.attrib.get("t", "")
                v = c.find(f"{ns}v")
                val = v.text if v is not None else ""
                if t == "s" and val.isdigit():
                    val = shared_strings[int(val)]
                row_dict[col_letter] = val
            if row_dict:
                rows_data.append(row_dict)
    return rows_data


def build_teencode_from_excel(excel_path: Path) -> Tuple[Dict[str, str], Dict[str, str]]:
    """
    Trích xuất và chuẩn hóa các cặp teencode -> từ chuẩn từ file Excel.
    Phân loại thành:
      - single_words: từ đơn (tra O(1) qua dict lookup)
      - multi_words: cụm từ ghép (thay thế qua unified regex)
    """
    rows = _parse_xlsx_raw(excel_path)
    single_words = dict(DEFAULT_TEENCODE_DICT)
    multi_words = {}
    skip_tc = {"w / l", "buff / nerf", "w/l", "buff/nerf"}

    for r in rows[1:]:
        tc = r.get("B", "").strip().lower()
        nghia = r.get("C", "").strip()
        norm = r.get("D", "").strip()

        if not tc or tc in skip_tc:
            continue

        # Ưu tiên cột "Dạng chuẩn hóa", nếu trống lấy "Nghĩa"
        val = norm if norm else nghia
        if not val:
            continue

        # Làm sạch chú thích ngữ cảnh trong ngoặc đơn nếu có (vd: "với ơi (nhấn)" -> "với ơi")
        val_clean = re.sub(r"\(.*?\)", "", val).strip()

        # Nếu có nhiều nghĩa ngăn cách bằng '/', ưu tiên nghĩa tiếng Việt chuẩn
        if "/" in val_clean:
            parts = [p.strip() for p in val_clean.split("/") if p.strip()]
            if len(parts) > 1 and re.search(r"[à-ỹ]", parts[1]) and not re.search(r"[à-ỹ]", parts[0]):
                val_clean = parts[1]
            else:
                val_clean = parts[0]

        # Xóa dấu chấm phân tách hàng nghìn trong số tiền (vd: 100.000đ -> 100000đ)
        # để tránh bị PhoBERT nhận nhầm thành dấu chấm kết thúc câu
        val_clean = re.sub(r"(\d+)\.(\d+)", r"\1\2", val_clean)

        clean_target = val_clean.lower().strip()
        if not clean_target:
            continue

        # Chuẩn hóa biểu tượng cảm xúc cười lớn :)) =))
        if ":))" in tc or "=))" in tc:
            clean_target = "cười lớn"

        keys = [k.strip().lower() for k in tc.split("/") if k.strip()]
        for k in keys:
            if k == clean_target:
                continue
            # Bỏ qua các ký tự đơn lẻ gây nhiễu
            if len(k) == 1 and k in ["w", "l"]:
                continue

            if " " in k:
                multi_words[k] = clean_target
            else:
                single_words[k] = clean_target

    return single_words, multi_words


def _compile_multi_regex(multi_words: Dict[str, str]) -> Optional[re.Pattern]:
    """Biên dịch regex tổng hợp cho tất cả cụm từ teencode nhiều từ theo thứ tự độ dài giảm dần."""
    if not multi_words:
        return None
    sorted_phrases = sorted(multi_words.keys(), key=lambda x: len(x), reverse=True)
    pattern_str = r"(?<!\w)(" + "|".join(re.escape(p) for p in sorted_phrases) + r")(?!\w)"
    return re.compile(pattern_str)


def load_teencode_dict():
    """
    Nạp từ điển teencode vào bộ nhớ.
    Ưu tiên tải từ file cache JSON (siêu nhanh ~1ms).
    Nếu file Excel mới hơn hoặc JSON chưa có, tự động phân tích Excel và cập nhật cache JSON.
    """
    global TEENCODE_SINGLE, TEENCODE_MULTI, TEENCODE_MULTI_REGEX, TEENCODE_SOURCE

    excel_path = None
    if TEENCODE_EXCEL_PATH.exists():
        excel_path = TEENCODE_EXCEL_PATH
    elif COLAB_EXCEL_PATH.exists():
        excel_path = COLAB_EXCEL_PATH

    json_path = TEENCODE_JSON_PATH

    # Kiểm tra xem cần cập nhật từ Excel hay không
    need_build_from_excel = False
    if excel_path and excel_path.exists():
        if not json_path.exists():
            need_build_from_excel = True
        elif excel_path.stat().st_mtime > json_path.stat().st_mtime:
            need_build_from_excel = True

    if need_build_from_excel and excel_path:
        logger.info(f"Đang nạp và biên dịch từ điển teencode từ Excel: {excel_path}...")
        try:
            single_w, multi_w = build_teencode_from_excel(excel_path)
            TEENCODE_SINGLE = single_w
            TEENCODE_MULTI = multi_w
            TEENCODE_MULTI_REGEX = _compile_multi_regex(multi_w)
            TEENCODE_SOURCE = f"excel ({excel_path.name})"

            # Lưu cache ra file JSON để các lần khởi động tiếp theo nạp tức thì
            try:
                json_path.parent.mkdir(parents=True, exist_ok=True)
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(
                        {"single_words": single_w, "multi_words": multi_w},
                        f,
                        ensure_ascii=False,
                        indent=2,
                    )
                logger.info(f"Đã lưu cache từ điển teencode ra: {json_path}")
            except Exception as e:
                logger.warning(f"Không thể ghi cache {json_path}: {e}")

            logger.info(
                f"Nạp thành công teencode: {len(single_w)} từ đơn, {len(multi_w)} cụm từ."
            )
            return
        except Exception as e:
            logger.error(f"Lỗi khi đọc file Excel {excel_path}: {e}. Đang thử nạp từ JSON...")

    # Tải từ JSON cache nếu có sẵn
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            single_w = data.get("single_words", {})
            multi_w = data.get("multi_words", {})

            # Hợp nhất với fallback mặc định
            merged_single = dict(DEFAULT_TEENCODE_DICT)
            merged_single.update(single_w)

            TEENCODE_SINGLE = merged_single
            TEENCODE_MULTI = multi_w
            TEENCODE_MULTI_REGEX = _compile_multi_regex(multi_w)
            TEENCODE_SOURCE = f"json ({json_path.name})"
            logger.info(
                f"Đã nạp nhanh teencode từ JSON: {len(TEENCODE_SINGLE)} từ đơn, {len(TEENCODE_MULTI)} cụm từ."
            )
            return
        except Exception as e:
            logger.error(f"Lỗi khi nạp teencode từ JSON {json_path}: {e}")

    # Fallback mặc định
    TEENCODE_SINGLE = dict(DEFAULT_TEENCODE_DICT)
    TEENCODE_MULTI = {}
    TEENCODE_MULTI_REGEX = None
    TEENCODE_SOURCE = "default_fallback"
    logger.warning("Sử dụng từ điển teencode mặc định (fallback).")


# Nạp từ điển ngay khi import module
load_teencode_dict()


def reload_teencode():
    """Hàm tiện ích reload từ điển teencode mà không cần restart service."""
    load_teencode_dict()


def get_teencode_stats() -> Dict[str, any]:
    """Lấy số liệu thống kê từ điển teencode đang hoạt động."""
    return {
        "source": TEENCODE_SOURCE,
        "single_words_count": len(TEENCODE_SINGLE),
        "multi_words_count": len(TEENCODE_MULTI),
        "total_terms": len(TEENCODE_SINGLE) + len(TEENCODE_MULTI),
    }


def replace_teencode(text: str) -> str:
    """
    Thay thế các từ và cụm từ teencode / lóng thành tiếng Việt chuẩn.
    Quy trình:
      1. Chuẩn hóa biểu tượng cười như :)), :))), =)) thành 'cười lớn'
      2. Thay thế cụm từ ghép (multi-word) qua unified regex
      3. Thay thế từ đơn (single-word) qua hash table tra cứu O(1)
    """
    if not text:
        return ""

    # 1. Chuẩn hóa biểu tượng cảm xúc dạng ký tự (:)), :))), =)), v.v.)
    text = re.sub(r"[:=]\)+", " cười lớn ", text)

    # 2. Thay thế cụm từ teencode nhiều từ (vd: 'not ok' -> 'không ổn', 'ảo ma canada' -> 'ảo tưởng cực độ')
    if TEENCODE_MULTI_REGEX is not None:
        text = TEENCODE_MULTI_REGEX.sub(lambda m: TEENCODE_MULTI[m.group(0)], text)

    # 3. Thay thế từ đơn teencode (vd: 'ko' -> 'không', 'iu' -> 'yêu', 'stress' -> 'căng thẳng')
    words = text.split()
    return " ".join([TEENCODE_SINGLE.get(w, w) for w in words])


def clean_text(text: str) -> str:
    """
    Tiền xử lý chuỗi văn bản bình luận tiếng Việt trước khi đưa vào PhoBERT.
    Pipeline chuẩn:
      1. Chuyển chữ thường (lowercase)
      2. Xóa liên kết (URL)
      3. Xóa @mention và #hashtag
      4. Tách khoảng trắng quanh dấu câu . , ? ! để từ dính dấu câu (vd: 'ko,', 'ngon!') được nhận dạng đúng
      5. Rút gọn ký tự lặp quá 2 lần (vd: 'ngonnnn' -> 'ngon', 'quáaa' -> 'quá')
      6. Rút gọn dấu câu spam (vd: '???' -> '?', '!!!!' -> '!')
      7. Chuẩn hóa teencode & tiếng lóng (áp dụng từ điển teencode.xlsx)
      8. Lọc ký tự lạ/rác, chỉ giữ chữ cái, chữ số tiếng Việt và các dấu . , ? !
      9. Chuẩn hóa khoảng trắng quanh dấu câu và khoảng trắng thừa
      10. Phân đoạn từ tiếng Việt với ViTokenizer.tokenize() theo chuẩn PhoBERT
    """
    if not isinstance(text, str):
        return ""

    # 1. Chuyển chữ thường
    text = text.lower()

    # 2. Xóa URL
    text = re.sub(r"https?://\S+|www\.\S+", "", text)

    # 3. Xóa mention (@username) và hashtag (#tag)
    text = re.sub(r"[@#]\w+", "", text)

    # 4. Tách khoảng trắng quanh dấu câu trước để từ teencode dính liền dấu câu (vd: 'hay quá,iu ghê') được tách rời
    text = re.sub(r"\s*([.,?!])\s*", r" \1 ", text)

    # 5. Xử lý kéo dài nguyên âm tiếng Việt có dấu (vd: 'quáaa' -> 'quá', 'ghêeee' -> 'ghê')
    text = re.sub(r"([áàảãạ])a+", r"\1", text)
    text = re.sub(r"([êếềểễệ])e+", r"\1", text)
    text = re.sub(r"([ôốồổỗộ])o+", r"\1", text)
    text = re.sub(r"([úùủũụ])u+", r"\1", text)
    text = re.sub(r"([íìỉĩị])i+", r"\1", text)
    # Rút gọn ký tự lặp quá 2 lần (vd: 'ngonnnn' -> 'ngon', 'điiii' -> 'đi')
    text = re.sub(r"([a-zà-ỹ])\1{2,}", r"\1", text)

    # 6. Rút gọn dấu câu bị spam lặp lại
    text = re.sub(r"([.?!])\1+", r"\1", text)

    # 7. Chuẩn hóa teencode
    text = replace_teencode(text)

    # 8. Xóa ký tự lạ/rác, NHƯNG GIỮ LẠI: chữ, số, tiếng Việt và các dấu . , ? !
    text = re.sub(r"[^0-9a-zà-ỹ\s.,?!]", " ", text)

    # 9. Tách khoảng trắng quanh dấu câu & chuẩn hóa khoảng trắng thừa
    text = re.sub(r"\s*([.,?!])\s*", r" \1 ", text)
    text = re.sub(r"\s+", " ", text).strip()

    # 10. TÁCH TỪ TIẾNG VIỆT (Bắt buộc chuẩn theo PhoBERT)
    text = ViTokenizer.tokenize(text)

    return text
