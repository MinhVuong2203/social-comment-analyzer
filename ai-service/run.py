import sys
import uvicorn

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    
    print("=" * 60)
    print("🚀 Đang khởi động PhoBERT AI Service trên cổng 8000...")
    print("⏳ Quá trình tải 3 mô hình PhoBERT (khoảng 1.5 GB) mất ~5-10 giây.")
    print("   Vui lòng giữ cửa sổ Terminal mở và KHÔNG bấm Ctrl+C trong lúc này.")
    print("=" * 60)
    
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info",
    )
