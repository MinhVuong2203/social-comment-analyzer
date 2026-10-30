import re
from pyvi import ViTokenizer

# 1. Từ điển chuẩn hóa teencode tiếng Việt thông dụng (đồng bộ 100% với Colab huấn luyện)
TEENCODE_DICT = {
    "ko": "không", "k": "không", "kh": "không", "hok": "không", "hong": "không",
    "dc": "được", "dk": "được", "đc": "được",
    "vs": "với", "j": "gì", "r": "rồi", "cx": "cũng",
    "thik": "thích", "thjx": "thích", "mik": "mình",
    "t": "tao", "m": "mày", "ae": "anh em",
    "ng": "người", "ntn": "như thế nào", "sao": "sao",
    "đt": "điện thoại", "fb": "facebook", "ib": "nhắn tin",
    "bt": "bình thường",
}


def replace_teencode(text: str) -> str:
    """Thay thế các từ teencode phổ biến thành từ tiếng Việt chuẩn."""
    words = text.split()
    return " ".join([TEENCODE_DICT.get(w, w) for w in words])


def clean_text(text: str) -> str:
    """
    Tiền xử lý chuỗi văn bản bình luận tiếng Việt trước khi đưa vào PhoBERT.
    Đúng chuẩn pipeline Colab:
      1. Lowercase
      2. Xóa URL
      3. Xóa @mention và #hashtag
      4. Rút gọn ký tự lặp quá 2 lần (vd: "ngonnnn" -> "ngon")
      5. Rút gọn dấu câu spam (vd: "???" -> "?", "!!!!" -> "!")
      6. Chuẩn hóa teencode
      7. Giữ chữ, số, tiếng Việt và các dấu . , ? !
      8. Tách khoảng trắng quanh dấu câu
      9. Chuẩn hóa khoảng trắng thừa
      10. Phân đoạn từ tiếng Việt với ViTokenizer.tokenize()
    """
    if not isinstance(text, str):
        return ""

    # 1. Chuyển chữ thường
    text = text.lower()

    # 2. Xóa URL
    text = re.sub(r"https?://\S+|www\.\S+", "", text)

    # 3. Xóa mention (@username) và hashtag (#tag)
    text = re.sub(r"[@#]\w+", "", text)

    # 4. Rút gọn ký tự lặp quá 2 lần
    text = re.sub(r"([a-zà-ỹ])\1{2,}", r"\1", text)

    # 5. Rút gọn dấu câu bị spam lặp lại
    text = re.sub(r"([.?!])\1+", r"\1", text)

    # 6. Chuẩn hóa teencode
    text = replace_teencode(text)

    # 7. Xóa ký tự lạ/rác, NHƯNG GIỮ LẠI: chữ, số, tiếng Việt và các dấu . , ? !
    text = re.sub(r"[^0-9a-zà-ỹ\s.,?!]", " ", text)

    # 8. Tách khoảng trắng quanh dấu câu để tránh dính liền từ
    text = re.sub(r"\s*([.,?!])\s*", r" \1 ", text)

    # 9. Chuẩn hóa khoảng trắng thừa
    text = re.sub(r"\s+", " ", text).strip()

    # 10. TÁCH TỪ TIẾNG VIỆT (Bắt buộc chuẩn theo PhoBERT)
    text = ViTokenizer.tokenize(text)

    return text
