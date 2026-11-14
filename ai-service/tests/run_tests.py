#!/usr/bin/env python3
"""
Test Runner cho AI Service (Social Comment Analyzer - PhoBERT Microservice)
Tự động khám phá và chạy tất cả các test case trong thư mục tests.
"""

import os
import sys
import unittest
from pathlib import Path

# Đảm bảo UTF-8 trên Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

def run_all_tests():
    print("=" * 70)
    print("🚀 BẮT ĐẦU CHẠY TOÀN BỘ UNIT TEST CHO AI SERVICE (PHOBERT)")
    print("=" * 70)

    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=str(Path(__file__).parent), pattern="test_*.py")

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("=" * 70)
    print(f"Tổng số test: {result.testsRun}")
    print(f"Thành công:   {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Thất bại:     {len(result.failures)}")
    print(f"Lỗi:          {len(result.errors)}")
    print("=" * 70)

    return 0 if result.wasSuccessful() else 1

if __name__ == "__main__":
    sys.exit(run_all_tests())

