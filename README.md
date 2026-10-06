# Project 1 — PhoBERT cho phân loại bình luận tiếng Việt

> **Mục đích:** Tài liệu trung tâm mô tả bài toán, kiến trúc, cấu trúc source code, quy tắc phát triển và các quyết định thiết kế của Project 1.

---

## 1. Tổng quan

### 1.1. Đề tài

**Nghiên cứu và thực nghiệm PhoBERT cho phân tích và phân loại bình luận tiếng Việt trên mạng xã hội Threads.**

Project xây dựng một hệ thống hỗ trợ **phân tích các bình luận tiếng Việt trong một bài viết trên Threads** bằng mô hình ngôn ngữ tiền huấn luyện **PhoBERT**.

Hệ thống được triển khai dưới dạng **Chrome Extension**, cho phép người dùng đăng nhập tài khoản Threads, lựa chọn một bài viết thuộc tài khoản của mình và thực hiện phân tích các bình luận của bài viết đó.

Bên cạnh Chrome Extension dành cho người dùng, hệ thống có một **Web Admin** nhằm quản lý người dùng Extension, theo dõi trạng thái tài khoản và theo dõi hoạt động của hệ thống.

Mục tiêu của hệ thống không chỉ là huấn luyện một mô hình AI mà còn đưa mô hình PhoBERT vào một hệ thống phần mềm hoàn chỉnh:

- **Chrome Extension:** giao diện chính để người dùng tương tác với Threads và phân tích bình luận.
- **Web Admin:** giao diện dành cho quản trị viên để quản lý người dùng Extension và theo dõi hệ thống.
- **Backend:** xử lý nghiệp vụ, xác thực, giao tiếp với Threads API, AI Service và Database.
- **AI Service:** thực hiện tiền xử lý và inference bằng PhoBERT.
- **Database:** lưu trữ người dùng, bài viết, bình luận, kết quả phân tích và lịch sử.

### 1.2. Mục tiêu của hệ thống

#### Đối với người dùng Threads

Hệ thống cho phép người dùng:

1. Đăng nhập thông qua Threads OAuth.
2. Truy cập các bài viết thuộc tài khoản Threads đã đăng nhập.
3. Lựa chọn một bài viết cần phân tích.
4. Lấy danh sách các bình luận thuộc bài viết.
5. Phân tích một bình luận cụ thể.
6. Phân tích toàn bộ bình luận của bài viết.
7. Xem kết quả phân tích của từng bình luận.
8. Xem thống kê tổng quan của các bình luận.
9. Tìm kiếm, lọc và sắp xếp bình luận.
10. Xem lại lịch sử các lần phân tích.

#### Đối với quản trị viên

Web Admin cho phép quản trị viên:

1. Đăng nhập vào hệ thống quản trị.
2. Xem danh sách người dùng Extension.
3. Xem thông tin cơ bản và trạng thái người dùng.
4. Tìm kiếm, lọc và sắp xếp người dùng.
5. Quản lý trạng thái tài khoản người dùng.
6. Theo dõi hoạt động phân tích của người dùng.
7. Xem thống kê sử dụng hệ thống.
8. Quản lý các dữ liệu phục vụ vận hành hệ thống.

### 1.3. Kiến trúc tổng quan

```text
                    ┌──────────────────────┐
                    │       HỆ THỐNG       │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
       ┌─────────────────┐           ┌─────────────────┐
       │ Người dùng      │           │ Quản trị viên   │
       │ Threads         │           │ Admin           │
       └────────┬────────┘           └────────┬────────┘
                │                             │
                ▼                             ▼
       ┌─────────────────┐           ┌─────────────────┐
       │ Chrome          │           │ Web Admin       │
       │ Extension       │           │ React           │
       │ React           │           │                 │
       └────────┬────────┘           └────────┬────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                    ┌──────────────────────┐
                    │   Java Spring Boot   │
                    │       Backend        │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌────────────┐    ┌────────────┐    ┌────────────┐
      │ Threads API│    │ AI Service │    │   MySQL    │
      │            │    │   Python   │    │            │
      └────────────┘    └─────┬──────┘    └────────────┘
                               │
                               ▼
                         ┌───────────┐
                         │  PhoBERT  │
                         └───────────┘
```

### 1.4. Công nghệ chính

| Thành phần         | Công nghệ                                  |
| ------------------ | ------------------------------------------ |
| AI/ML              | Python, PyTorch, Hugging Face Transformers |
| NLP                | PhoBERT                                    |
| AI Service         | Python                                     |
| Backend            | Java Spring Boot                           |
| Chrome Extension   | React                                      |
| Web Admin          | React                                      |
| Database           | MySQL                                      |
| Social Network     | Threads                                    |
| Browser            | Google Chrome                              |
| Training           | Google Colab                               |
| Version Control    | Git / GitHub                               |
| Project Management | Jira                                       |

---

# 2. Bài toán

## 2.1. Phát biểu bài toán

Người dùng Threads có thể tạo các bài viết và nhận được nhiều bình luận từ những người dùng khác. Khi số lượng bình luận lớn, việc đọc, phân loại và đánh giá thủ công toàn bộ bình luận sẽ mất nhiều thời gian.

Các bình luận trên mạng xã hội thường có đặc điểm:

- Ngôn ngữ tự nhiên, không theo chuẩn văn viết.
- Sử dụng teencode và viết tắt.
- Sử dụng emoji và ký tự đặc biệt.
- Có lỗi chính tả.
- Có thể chứa nội dung tiêu cực hoặc công kích.
- Có thể chứa ngôn ngữ thù ghét.
- Có thể thể hiện nhiều trạng thái cảm xúc khác nhau.

Bài toán của hệ thống là:

> **Xây dựng một Chrome Extension hỗ trợ người dùng Threads lựa chọn một bài viết và tự động phân tích các bình luận thuộc bài viết đó bằng mô hình PhoBERT, đồng thời cung cấp Web Admin để quản lý người dùng Extension và theo dõi hoạt động của hệ thống.**

## 2.2. Đầu vào

Đầu vào chính của hệ thống là **một bài viết trên Threads và danh sách các bình luận thuộc bài viết đó**.

```text
Tài khoản Threads
        │
        ▼
Danh sách bài viết của người dùng
        │
        ▼
Người dùng chọn một bài viết
        │
        ▼
Threads API
        │
        ▼
Danh sách bình luận
        │
        ▼
Comment Text
```

Ví dụ:

```text
Bài viết:
"Hôm nay đi làm về mệt quá 😭"

Các bình luận:

1. "Cố lên bạn ơi ❤️"
2. "Đi làm mà than hoài vậy?"
3. "Mệt thì nghỉ đi chứ 😂"
4. "Đúng là công việc gì cũng áp lực."
```

Mỗi bình luận được xem là một đơn vị dữ liệu cần phân tích.

## 2.3. Dữ liệu của một bình luận

Một comment có thể được biểu diễn tối thiểu:

```json
{
  "commentId": "123456",
  "postId": "987654",
  "author": "username",
  "text": "Cố lên bạn ơi ❤️",
  "createdAt": "2026-10-06T08:30:00"
}
```

| Thuộc tính  | Ý nghĩa                                       |
| ----------- | --------------------------------------------- |
| `commentId` | ID duy nhất của bình luận                     |
| `postId`    | ID bài viết chứa bình luận                    |
| `author`    | Người viết bình luận nếu Threads API cung cấp |
| `text`      | Nội dung bình luận                            |
| `createdAt` | Thời điểm tạo bình luận nếu API cung cấp      |

## 2.4. Quy trình xử lý

```text
              Threads Post
                   │
                   ▼
            Danh sách Comment
                   │
                   ▼
          Text Preprocessing
                   │
                   ▼
              Tokenizer
                   │
                   ▼
                PhoBERT
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
      Toxicity   Hate     Sentiment
          │        │        │
          └────────┼────────┘
                   ▼
             Prediction
                   │
                   ▼
             Lưu kết quả
                   │
          ┌────────┴────────┐
          ▼                 ▼
    Extension UI        Database
```

Mô hình có thể thực hiện nhiều nhiệm vụ phân loại tùy theo dataset và mô hình được huấn luyện.

### Toxicity

```text
Toxic
Non-toxic
```

### Hate Speech

```text
Hate
Non-hate
```

### Sentiment

```text
Positive
Neutral
Negative
```

## 2.5. Phân tích một bình luận

Người dùng có thể chọn một bình luận cụ thể:

```text
User
 │
 ▼
Chọn Comment
 │
 ▼
Click "Phân tích"
 │
 ▼
Chrome Extension
 │
 ▼
Spring Boot Backend
 │
 ▼
AI Service
 │
 ▼
PhoBERT
 │
 ▼
Prediction
 │
 ▼
Spring Boot
 │
 ├── Lưu Database
 │
 └── Trả kết quả
        │
        ▼
Chrome Extension
```

Ví dụ kết quả:

```json
{
  "commentId": "123456",
  "toxicity": {
    "label": "non-toxic",
    "confidence": 0.97
  },
  "hateSpeech": {
    "label": "non-hate",
    "confidence": 0.98
  },
  "sentiment": {
    "label": "positive",
    "confidence": 0.94
  }
}
```

## 2.6. Phân tích toàn bộ bình luận

Hệ thống hỗ trợ phân tích toàn bộ bình luận của bài viết:

```text
Selected Post
     │
     ▼
100 Comments
     │
     ├── Comment 1 ──► AI
     ├── Comment 2 ──► AI
     ├── Comment 3 ──► AI
     ├── ...
     └── Comment 100 ─► AI
              │
              ▼
       Kết quả phân tích
              │
       ┌──────┴──────┐
       ▼             ▼
   Danh sách      Thống kê
   kết quả        tổng quan
```

Hệ thống không nên gọi AI lại đối với comment đã có kết quả hợp lệ.

## 2.7. Kết quả phân tích

Ví dụ:

| Comment          | Toxicity  | Hate Speech | Sentiment |
| ---------------- | --------- | ----------- | --------- |
| Cố lên bạn ơi ❤️ | Non-toxic | Non-hate    | Positive  |
| Thật là tệ       | Toxic     | Non-hate    | Negative  |
| Đúng là loại...  | Toxic     | Hate        | Negative  |

Ngoài label, hệ thống có thể lưu:

- Confidence.
- Probability của từng class.
- Thời gian phân tích.
- Model version.
- Trạng thái phân tích.
- Bài viết tương ứng.
- Người dùng thực hiện phân tích.

## 2.8. Thống kê của bài viết

Sau khi phân tích, hệ thống tổng hợp thống kê:

```text
Bài viết: Post A

Tổng số bình luận: 150

Toxicity
├── Non-toxic: 120 (80%)
└── Toxic:      30 (20%)

Hate Speech
├── Non-hate: 135 (90%)
└── Hate:      15 (10%)

Sentiment
├── Positive: 70 (46.7%)
├── Neutral:  50 (33.3%)
└── Negative: 30 (20%)
```

Các thống kê được hiển thị trên Chrome Extension và lưu phục vụ lịch sử.

## 2.9. Bài toán quản lý người dùng bằng Web Admin

Ngoài phân tích bình luận, hệ thống có một **Web Admin** dành riêng cho quản trị viên.

```text
                  SYSTEM
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   Chrome Extension         Web Admin
          │                     │
       Người dùng            Admin
          │                     │
          └──────────┬──────────┘
                     ▼
              Spring Boot
                     │
                     ▼
                   MySQL
```

Chrome Extension phục vụ người dùng cuối, trong khi Web Admin phục vụ quản trị viên.

## 2.10. Quản lý người dùng Extension

Web Admin cung cấp danh sách người dùng:

| ID  | Username | Threads Account | Trạng thái | Ngày tham gia | Hoạt động gần nhất |
| --- | -------- | --------------- | ---------- | ------------- | ------------------ |
| 001 | user01   | @user01         | Active     | 01/10/2026    | 06/10/2026         |
| 002 | user02   | @user02         | Active     | 02/10/2026    | 05/10/2026         |
| 003 | user03   | @user03         | Blocked    | 03/10/2026    | 04/10/2026         |

Admin có thể:

- Xem danh sách người dùng.
- Tìm kiếm người dùng.
- Lọc theo trạng thái.
- Xem thông tin tài khoản.
- Xem lịch sử hoạt động.
- Kích hoạt/vô hiệu hóa tài khoản nếu có chính sách.
- Xem số lượng bài viết đã phân tích.
- Xem số lượng comment đã phân tích.

## 2.11. Quản lý hoạt động phân tích

Admin có thể theo dõi hoạt động:

```text
User
 │
 ├── Post A
 │     ├── 100 comments
 │     └── analyzed
 │
 ├── Post B
 │     ├── 50 comments
 │     └── analyzed
 │
 └── Post C
       └── chưa phân tích
```

Các thống kê quản trị có thể gồm:

- Tổng số người dùng.
- Người dùng đang hoạt động.
- Tổng số bài viết được phân tích.
- Tổng số bình luận được phân tích.
- Số lượng Toxic.
- Số lượng Hate Speech.
- Phân bố Sentiment.
- Số lượt phân tích theo thời gian.

## 2.12. Phân quyền

Hệ thống có tối thiểu hai nhóm quyền:

```text
                 Authentication
                       │
              ┌────────┴────────┐
              ▼                 ▼
            USER              ADMIN
              │                 │
              ▼                 ▼
     Chrome Extension       Web Admin
              │                 │
       Phân tích comment    Quản lý hệ thống
```

### USER

- Đăng nhập.
- Sử dụng Extension.
- Chọn bài viết.
- Xem comment.
- Phân tích comment.
- Xem kết quả.
- Xem lịch sử của mình.

### ADMIN

- Đăng nhập Web Admin.
- Quản lý người dùng.
- Xem hoạt động người dùng.
- Xem thống kê toàn hệ thống.
- Quản lý trạng thái tài khoản.
- Quản lý dữ liệu quản trị.

Admin không thực hiện phân tích thay cho người dùng; Admin chủ yếu quản lý và giám sát hệ thống.

## 2.13. Phạm vi bài toán

Project tập trung vào:

1. Xây dựng Chrome Extension cho Threads.
2. Kết nối Threads API.
3. Xác thực người dùng thông qua Threads OAuth.
4. Lấy bài viết của tài khoản người dùng.
5. Cho phép chọn một bài viết.
6. Lấy các bình luận thuộc bài viết.
7. Phân tích một hoặc nhiều bình luận.
8. Sử dụng PhoBERT cho các nhiệm vụ phân loại.
9. Lưu kết quả phân tích.
10. Hiển thị thống kê.
11. Xây dựng Web Admin.
12. Quản lý người dùng Extension.
13. Theo dõi hoạt động sử dụng hệ thống.
14. Kiểm thử end-to-end từ Threads → Extension → Backend → AI → Database.

## 2.14. Luồng nghiệp vụ tổng thể

```text
                         ┌──────────────────────┐
                         │       THREADS        │
                         └──────────┬───────────┘
                                    │
                              OAuth / API
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │    SPRING BOOT BACKEND   │
                    └─────────────┬─────────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
      │   Threads   │      │ AI Service  │      │    MySQL    │
      │     API     │      │   Python    │      │  Database   │
      └─────────────┘      └──────┬──────┘      └─────────────┘
                                  │
                                  ▼
                            ┌───────────┐
                            │  PhoBERT  │
                            └───────────┘
                                  ▲
                                  │
              ┌───────────────────┴───────────────────┐
              │                                       │
       ┌──────┴───────┐                       ┌───────┴──────┐
       │    USER      │                       │    ADMIN     │
       └──────┬───────┘                       └───────┬──────┘
              │                                       │
              ▼                                       ▼
       ┌──────────────┐                       ┌──────────────┐
       │    Chrome    │                       │  Web Admin   │
       │  Extension   │                       │    React     │
       │    React     │                       │              │
       └──────┬───────┘                       └──────────────┘
              │
              ▼
       ┌──────────────┐
       │ Chọn 1 Post  │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │ Lấy Comments │
       └──────┬───────┘
              │
       ┌──────┴───────┐
       │              │
       ▼              ▼
 Analyze 1       Analyze All
       │              │
       └──────┬───────┘
              ▼
       ┌──────────────┐
       │ Kết quả AI   │
       └──────┬───────┘
              │
       ┌──────┴───────────┐
       ▼                  ▼
  Hiển thị kết quả    Lưu lịch sử
```

# 4. Phạm vi nghiên cứu

## 3.1. Phạm vi chính

Project tập trung vào:

- PhoBERT và kiến trúc Transformer cho tiếng Việt.
- Fine-tuning PhoBERT trên dataset tiếng Việt.
- Tiền xử lý dữ liệu văn bản.
- Huấn luyện và đánh giá mô hình.
- Phân loại văn bản/bình luận.
- Đưa mô hình AI vào một hệ thống phần mềm.
- Kiểm thử end-to-end từ text → API → AI → kết quả.
- Xây dựng giao diện quản lý và/hoặc browser extension.

## 3.2. Phân biệt nghiên cứu và sản phẩm

AI model là **thành phần cốt lõi**, không phải một tính năng phụ.

```text
Nghiên cứu
   │
   ├── Dataset
   ├── Preprocessing
   ├── Fine-tuning
   ├── Evaluation
   └── Error Analysis
           │
           ▼
Ứng dụng
   │
   ├── AI Service
   ├── Backend API
   ├── Dashboard
   └── Chrome Extension
```

---

# 5. Kiến trúc hệ thống

## 4.1. Kiến trúc tổng thể

```text
                         ┌──────────────────────┐
                         │       User           │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
          ┌──────────────────┐             ┌──────────────────┐
          │ Chrome Extension │             │   Web Admin / React │
          │     React        │             │     React        │
          └────────┬─────────┘             └────────┬─────────┘
                   │                                │
                   └───────────────┬────────────────┘
                                   ▼
                       ┌─────────────────────┐
                       │  Java Spring Boot   │
                       └──────────┬──────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              ┌──────────┐  ┌──────────┐
              │AI Service│  │ MySQL    |
              |			 |  |		   |
              │ Python   │  │          │
              └────┬─────┘  └──────────┘
                   │
                   ▼
              ┌──────────┐
              │ PhoBERT  │
              └──────────┘
```

## 4.2. Nguyên tắc phân tầng

### Chrome Extension (React)

Chịu trách nhiệm:

- Đọc nội dung cần phân tích trên trang web.
- Gửi text về backend.
- Hiển thị kết quả phân loại.

Extension **không chứa model PhoBERT**.

### Web Admin (React)

Chịu trách nhiệm:

- Dashboard quản trị.
- Thống kê hệ thống.
- Quản lý người dùng Extension.
- Theo dõi hoạt động phân tích.
- Tìm kiếm, lọc và sắp xếp dữ liệu.

### Backend

Chịu trách nhiệm:

- Authentication/Authorization nếu có.
- API.
- Business logic.
- Validation.
- Giao tiếp với AI Service.
- Lưu dữ liệu.
- Cung cấp dữ liệu cho Dashboard.

### AI Service

Chịu trách nhiệm:

- Load tokenizer.
- Load PhoBERT.
- Preprocess input.
- Inference.
- Trả prediction.
- Không chứa business logic của web application.

### Database

Lưu:

- User/account nếu hệ thống có authentication.
- Nội dung phân tích.
- Kết quả AI.
- Lịch sử.
- Thống kê hoặc dữ liệu phục vụ thống kê.

---

# 6. AI / PhoBERT

## 5.1. Model

Model nền:

```text
PhoBERT
   │
   ▼
Shared Representation
   │
   ├── Classification Head 1
   ├── Classification Head 2
   └── Classification Head 3
```

Project có thể sử dụng kiến trúc multi-task khi dataset và nhãn tương ứng đã được chuẩn bị đầy đủ.

Một hướng multi-task đã được xác định:

```text
PhoBERT
   │
   ├── Toxicity
   │     ├── Toxic
   │     └── Non-toxic
   │
   ├── Hate Speech
   │     ├── Hate
   │     └── Non-hate
   │
   └── Sentiment
         ├── Positive
         ├── Neutral
         └── Negative
```

Loss tổng:

```text
L = λ1 L_toxicity
  + λ2 L_hate
  + λ3 L_sentiment
```

> Không được mặc định rằng một dataset duy nhất đã chứa đầy đủ nhãn cho tất cả task. Dataset và label mapping phải được kiểm tra trước khi huấn luyện multi-task.

## 5.2. Evaluation

Các metric chính:

- Macro F1
- Weighted F1
- Per-class F1
- Confusion Matrix

Không chỉ sử dụng Accuracy khi dataset mất cân bằng.

### Macro F1

Đặc biệt quan trọng khi các lớp có số lượng mẫu không đồng đều.

### Weighted F1

Phản ánh hiệu năng có xét đến tỷ lệ mẫu của từng lớp.

### Per-class F1

Dùng để xác định model hoạt động tốt/xấu ở từng nhãn.

### Confusion Matrix

Dùng để phân tích:

- Nhãn nào thường bị nhầm.
- Lớp nào có recall thấp.
- Các loại lỗi thường gặp.

---

# 7. AI Training Pipeline

```text
Dataset
   │
   ▼
Data Cleaning
   │
   ▼
Label Mapping
   │
   ▼
Train / Validation / Test Split
   │
   ▼
Tokenizer
   │
   ▼
PhoBERT Fine-tuning
   │
   ▼
Evaluation
   │
   ├── Macro F1
   ├── Weighted F1
   ├── Per-class F1
   └── Confusion Matrix
   │
   ▼
Best Checkpoint
   │
   ▼
Export Model
   │
   ▼
AI Service
```

## 6.1. Training environment

Training ưu tiên thực hiện trên:

**Google Colab**

Lý do:

- Không phụ thuộc GPU local.
- Dễ sử dụng CUDA GPU của Colab.
- Dễ thử nghiệm nhiều configuration.
- Phù hợp với quá trình fine-tuning PhoBERT.

Sau khi training:

```text
Colab
  │
  ├── model/
  ├── tokenizer/
  └── config/
        │
        ▼
Download
        │
        ▼
Local AI Service
```

---

# 8. Cấu trúc project AI

Cấu trúc đề xuất:

```text
ai-service/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── splits/
│
├── models/
│   └── checkpoints/
│
├── src/
│   ├── data/
│   ├── preprocessing/
│   ├── models/
│   ├── training/
│   ├── evaluation/
│   └── inference/
│
├── experiments/
│
├── notebooks/
│
├── train.py
├── evaluate.py
├── predict.py
├── requirements.txt
└── README.md
```

### Quy tắc

- `data/raw/`: dữ liệu gốc, không chỉnh sửa trực tiếp.
- `data/processed/`: dữ liệu sau preprocessing.
- `data/splits/`: train/validation/test.
- `models/checkpoints/`: model checkpoint.
- `src/preprocessing/`: xử lý text.
- `src/models/`: định nghĩa model.
- `src/training/`: training logic.
- `src/evaluation/`: metric và evaluation.
- `src/inference/`: inference.
- `experiments/`: kết quả từng thí nghiệm.
- `notebooks/`: notebook phục vụ nghiên cứu/thử nghiệm.

Không commit dataset lớn hoặc model checkpoint lớn vào Git nếu không cần thiết.

---

# 9. AI Service API

AI Service là service riêng biệt, chịu trách nhiệm inference.

Ví dụ:

```http
POST /predict
Content-Type: application/json
```

Request:

```json
{
  "text": "Bình luận cần phân tích"
}
```

Response:

```json
{
  "label": "positive",
  "confidence": 0.94
}
```

Nếu sử dụng multi-task:

```json
{
  "toxicity": {
    "label": "non-toxic",
    "confidence": 0.97
  },
  "hate_speech": {
    "label": "non-hate",
    "confidence": 0.98
  },
  "sentiment": {
    "label": "positive",
    "confidence": 0.94
  }
}
```

### Nguyên tắc

Backend không tự thực hiện logic của PhoBERT.

```text
Backend
   │
   │ HTTP
   ▼
AI Service
   │
   ▼
PhoBERT
```

---

# 10. Backend

## 9.1. Trách nhiệm

Backend Spring Boot là tầng trung gian giữa Chrome Extension, Threads API, AI Service và MySQL.

```text
Client
  │
  ▼
Controller
  │
  ▼
Service
  │
  ├── AI Client
  ├── Repository / JPA
  └── Business Logic
  │
  ▼
Database
```

## 9.2. Quy tắc

Controller:

- Không chứa business logic dài.
- Chỉ nhận request và trả response.
- Validation cơ bản có thể đặt ở request model.

Service:

- Chứa business logic.
- Gọi AI Service.
- Xử lý kết quả.

Repository/Data Access:

- Chịu trách nhiệm truy cập database nếu project sử dụng Repository Pattern.

Entity/DTO:

- Entity dùng cho persistence.
- DTO dùng cho API contract.
- Không trả Entity trực tiếp nếu không cần thiết.

---

# 11. Frontend — React

Frontend được xây dựng bằng React và đóng gói dưới dạng Chrome Extension.

Các module dự kiến:

```text
Dashboard
├── Overview
├── Analysis
├── History
├── Statistics
├── Moderation
└── Settings
```

### Dashboard

Có thể hiển thị:

- Tổng số comment đã phân tích.
- Phân bố label.
- Tỷ lệ các nhóm phân loại.
- Thống kê theo thời gian.
- Danh sách kết quả gần đây.

### History

Lưu và xem:

```text
Text
Label
Confidence
CreatedAt
```

### Moderation

Nếu hệ thống được mở rộng thành moderation platform:

```text
Comment
   │
   ├── Allow
   ├── Review
   └── Block
```

Các action này là **business rule của ứng dụng**, không phải label của PhoBERT.

---

# 12. Chrome Extension

## 11.1. Mục tiêu

Extension cho phép người dùng phân tích text trực tiếp trên website.

Luồng:

```text
User selects / page contains text
          │
          ▼
Chrome Extension
          │
          ▼
Backend API
          │
          ▼
AI Service
          │
          ▼
PhoBERT
          │
          ▼
Prediction
          │
          ▼
Extension UI
```

## 11.2. Các chức năng

- Đọc text/comment.
- Gửi request phân tích.
- Hiển thị label.
- Hiển thị confidence.
- Đánh dấu comment.
- Ẩn comment theo rule.
- Hiển thị lại comment.
- Theo dõi comment mới nếu DOM thay đổi.
- Tránh xử lý duplicate comment.

# 13. Threads Integration

Project có phần thử nghiệm tích hợp Threads.

## 12.1. OAuth

Luồng tổng quát:

```text
User
 │
 ▼
Frontend / Extension
 │
 ▼
Backend
 │
 ▼
Threads OAuth
 │
 ▼
Callback
 │
 ▼
Access Token
 │
 ▼
Threads API
```

Trong môi trường development, callback có thể cần public HTTPS URL, ví dụ thông qua tunnel.

## 12.2. Quy tắc quan trọng

Không hard-code:

- App Secret
- Access Token
- Client Secret
- API credential

Các thông tin cấu hình nhạy cảm không commit vào Git.

Ví dụ:

```properties
threads.thread-id=...
threads.thread-secret=...
```

File chứa secret thực tế phải được ignore.

### Production

Production cần thiết kế theo hướng:

```text
User A ──┐
User B ──┼── OAuth ── Backend ── Threads API
User C ──┘
```

Không thiết kế production theo kiểu một access token dùng chung cho tất cả người dùng.

---

# 14. Database

MySQL được sử dụng làm database chính của hệ thống web.

Thiết kế cần phân biệt:

### User

```text
User
├── Id
├── Username
├── Email
└── CreatedAt
```

### Analysis

```text
Analysis
├── Id
├── UserId
├── Text
├── CreatedAt
└── ...
```

### Prediction

```text
Prediction
├── Id
├── AnalysisId
├── Task
├── Label
├── Confidence
└── CreatedAt
```

Nếu thiết kế multi-task, có thể lưu từng task prediction riêng thay vì tạo nhiều cột cố định.

# 15. Git

## 15.1. Không commit

Không commit:

```text
.env
application.properties
secret files
access tokens
API keys
large model checkpoints
virtual environments
build output
node_modules
```

Ví dụ:

```gitignore
application.properties
.env
venv/
.venv/
__pycache__/
node_modules/
bin/
obj/
target/
models/checkpoints/
```

## 15.2. Untrack file đã commit

Nếu file đã nằm trong Git nhưng sau đó mới thêm vào `.gitignore`:

```bash
git rm --cached <file>
```

Ví dụ:

```bash
git rm --cached backend/src/main/resources/application.properties
```

Sau đó:

```bash
git add .
git commit -m "chore: remove sensitive config from tracking"
```

> `.gitignore` chỉ ngăn file mới được track. Nó không tự xóa file đã được Git tracking.

## 15.3. Model lớn

Không push model training lớn trực tiếp vào repository nếu không có lý do rõ ràng.

```text
Git
 └── source code

Model Storage
 └── trained model
```

---

# 16. Quy ước code

## 16.1. Naming

### Java

```text
PascalCase
```

Ví dụ:

```java
AnalysisService
PredictionController
getAnalysisHistory()
```

### JavaScript / React

```text
camelCase
```

Ví dụ:

```javascript
analysisResult;
getPrediction();
```

### Python

```text
snake_case
```

Ví dụ:

```python
train_model()
preprocess_text()
load_checkpoint()
```

## 16.2. File

Tên file phải thể hiện rõ trách nhiệm.

Không tạo file kiểu:

```text
helper.py
common.py
utils2.py
testnew.py
```

nếu chưa có lý do rõ ràng.

Ưu tiên:

```text
text_preprocessor.py
phobert_classifier.py
prediction_service.py
```

---

# 17. API Design

API nên phân chia theo resource.

Ví dụ:

```text
/api/auth
/api/analysis
/api/predictions
/api/history
/api/statistics
/api/users
```

### Response

Nên thống nhất format.

Ví dụ:

```json
{
  "success": true,
  "message": "Analysis completed",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Invalid text",
  "data": null
}
```

Không trả stack trace hoặc thông tin nội bộ cho client production.

---

# 18. Error Handling

Các lỗi phải được phân loại.

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
```

Ví dụ:

### 400

Request sai format hoặc thiếu dữ liệu.

### 401

Chưa xác thực.

### 403

Đã xác thực nhưng không có quyền.

### 404

Resource không tồn tại.

### 500

Lỗi nội bộ server.

### 502

Backend không nhận được response hợp lệ từ AI Service/upstream.

### 503

Service tạm thời unavailable.

---

# 19. Security

## Không lưu secret trong source code

Sai:

```java
String secret = "MY_SECRET";
```

Đúng:

```text
application.properties
environment variables
secret manager
```

## Không log

Không log:

- Access token.
- Client secret.
- Password.
- API key.

## Input validation

Text gửi vào AI phải được:

- Validate.
- Giới hạn độ dài hợp lý.
- Normalize nếu cần.
- Xử lý input rỗng.

---

# 20. Testing

Testing được thực hiện ở nhiều tầng.

```text
Unit Test
    │
    ▼
Integration Test
    │
    ▼
API Test
    │
    ▼
System Test
    │
    ▼
End-to-End Test
```

## 20.1. AI

Test:

- Prediction đúng/sai.
- Class imbalance.
- Text ngắn.
- Text dài.
- Teencode.
- Emoji.
- Ký tự đặc biệt.
- Comment có lỗi chính tả.

## 20.2. Backend

Test:

- HTTP status.
- Validation.
- Authentication.
- Authorization.
- AI Service unavailable.
- Database failure.

## 20.3. Extension

Test:

- Comment xuất hiện ban đầu.
- Comment mới xuất hiện.
- Duplicate comment.
- Page reload.
- API timeout.
- Không có internet.
- Nhiều comment cùng lúc.

# 26. Repository structure tổng quát

Cấu trúc repository hiện tại có thể tổ chức theo dạng:

```text
Project1/
│
├── backend/
│   ├── src/
│   ├── pom.xml
│   └── ...
│
├── ai-service/
│   ├── data/
│   ├── models/
│   ├── src/
│   ├── experiments/
│   ├── notebooks/
│   ├── train.py
│   ├── evaluate.py
│   ├── predict.py
│   └── requirements.txt
│
├── frontend/
│   ├── extension/
│   ├── admin/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
|
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   └── experiments/
│
├── .gitignore
└── README.md
```
