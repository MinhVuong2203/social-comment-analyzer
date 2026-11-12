import os
import sys
import unittest
from pathlib import Path

# Thêm đường dẫn ai-service vào sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.preprocessing import (
    clean_text,
    replace_teencode,
    get_teencode_stats,
    DEFAULT_TEENCODE_DICT,
)


class TestPreprocessing(unittest.TestCase):
    """
    Bộ kiểm thử cho tầng tiền xử lý văn bản tiếng Việt của AI Service (PhoBERT Pipeline).
    """

    def test_teencode_single_word_replacement(self):
        """Kiểm tra thay thế teencode từ đơn phổ biến (ko -> không, dc -> được, vs -> với)"""
        raw = "sp này dùng cx dc nhưng ko thik lắm"
        processed = clean_text(raw)
        self.assertIn("không", processed)
        self.assertIn("được", processed)
        self.assertIn("thích", processed)
        self.assertIn("cũng", processed)
        self.assertNotIn(" ko ", f" {processed} ")
        self.assertNotIn(" dc ", f" {processed} ")

    def test_url_removal(self):
        """Kiểm tra loại bỏ các đường dẫn URL (http, https, www)"""
        raw = "Tham khảo tại https://threads.net/post/123 và www.google.com nha ae"
        processed = clean_text(raw)
        self.assertNotIn("http", processed)
        self.assertNotIn("https", processed)
        self.assertNotIn("www", processed)
        self.assertIn("anh em", processed)

    def test_mention_and_hashtag_removal(self):
        """Kiểm tra loại bỏ các thẻ @mention và #hashtag mạng xã hội"""
        raw = "Chào @threads_user bài viết #trending quá đỉnh"
        processed = clean_text(raw)
        self.assertNotIn("@threads_user", processed)
        self.assertNotIn("#trending", processed)
        self.assertIn("quá đỉnh", processed)

    def test_repeated_characters_reduction(self):
        """Kiểm tra rút gọn ký tự kéo dài quá 2 lần (vd: quáaa -> quá, ngonnnn -> ngon)"""
        raw = "Món này ngonnnn quáaaaa điiii"
        processed = clean_text(raw)
        self.assertNotIn("ngonnnn", processed)
        self.assertNotIn("quáaaaa", processed)
        self.assertIn("ngon", processed)
        self.assertIn("quá", processed)

    def test_repeated_punctuation_reduction(self):
        """Kiểm tra rút gọn dấu câu spam (???, !!! -> ?, !)"""
        raw = "Thật không vậy??? Quá đỉnh!!!!"
        processed = clean_text(raw)
        self.assertNotIn("???", processed)
        self.assertNotIn("!!!!", processed)
        self.assertIn("?", processed)
        self.assertIn("!", processed)

    def test_special_characters_filtering(self):
        """Kiểm tra loại bỏ các ký tự đặc biệt, icon rác nhưng giữ nguyên dấu câu hợp lệ"""
        raw = "Shop phục vụ tốt ⭐⭐⭐ $#%^^ 10/10 điểm!"
        processed = clean_text(raw)
        self.assertNotIn("⭐", processed)
        self.assertNotIn("$#%^^", processed)
        self.assertIn("shop phục vụ tốt", processed)
        self.assertIn("điểm !", processed)

    def test_empty_and_whitespace_input(self):
        """Kiểm tra xử lý văn bản rỗng, null, hoặc toàn khoảng trắng"""
        self.assertEqual(clean_text(""), "")
        self.assertEqual(clean_text("   "), "")
        self.assertEqual(clean_text(None), "")
        self.assertEqual(clean_text(12345), "")

    def test_teencode_stats(self):
        """Kiểm tra hàm lấy thống kê từ điển teencode"""
        stats = get_teencode_stats()
        self.assertIsInstance(stats, dict)
        self.assertIn("single_words_count", stats)
        self.assertGreater(stats["single_words_count"], 0)


if __name__ == "__main__":
    unittest.main()

