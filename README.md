# GAME DESIGN DOCUMENT (GDD)
## Tên dự án: Đừng Để Bóng Rơi... Hoặc Ăn Đấm! (Nghiệp Quật)
**Thể loại:** 2.5D, Party Game, Ragdoll Physics, Tấu hề
**Nền tảng:** Web Game (Browser-based)

---

## 1. Cốt Truyện (Storyline): "Cuộc Chiến Tranh Cúp Vô Tri"
*   **Bối cảnh:** Hai anh em đang combat mõm trên mạng để tranh giành một "Báu vật vô tri" (ví dụ: Bát mì tôm trứng cuối cùng, Sổ hồng căn nhà giấy, hoặc Chiếc cúp Mõm Vàng). 
*   **Sự cố:** Bất ngờ hệ thống mạng bị chập, hút linh hồn cả 2 vào thế giới ảo. Thân xác bị biến thành Người que 2D dặt dẹo, nhưng vẫn giữ nguyên cái đầu to đùng (ghép mặt thật).
*   **Luật sinh tồn:** Một thế lực bí ẩn phát cho mỗi người những công cụ hắc ám (bẫy gấu, vỏ chuối...). Để thoát ra và giành được "Báu vật", họ phải chơi dơ, lừa lọc và đấm nhau tay bo trong một chiều không gian 2.5D.

---

## 2. Kịch Bản Gameplay (Core Loop 3 Phase)
Mỗi ván game kéo dài tầm 2-3 phút, nhịp độ dồn dập:

### Phase 1: "Chơi Dơ" (45 Giây) - Góc nhìn chia đôi (Split-screen)
*   Hai người ở hai khu vực ẩn. Mỗi người nhận 1 Báu Vật Thật và 3 Báu Vật Giả (Bom xịt, Bẫy gấu).
*   **Nhiệm vụ:** Chạy lạch bạch đi giấu Báu Vật Thật, đặt Báu Vật Giả, và rải bẫy (vỏ chuối, đinh 3 góc...) khắp bản đồ.

### Phase 2: "Dò Mìn" (Không giới hạn) - Bẫy tàng hình
*   Màn hình vẫn chia đôi. Cả 2 đi tìm đồ của đối phương. Toàn bộ bẫy lúc này **biến mất khỏi tầm nhìn**.
*   **Mở nhầm đồ giả:** Bị nổ cháy đen mặt, mặt nhăn nhó (tự động đổi ảnh avatar), chạy chậm lại.
*   **Dẫm bẫy (của địch hoặc tự dẫm bẫy mình):** Nhân vật bị lò xo hất tung lên trời, lộn nhào ragdoll.

### Phase 3: "Hủy Diệt" (30 Giây) - Góc nhìn toàn cảnh (Shared-screen)
*   Ngay khi có người tìm được Báu Vật Thật, màn hình gộp làm một.
*   **Nhiệm vụ:** Người có đồ phải ôm chạy thục mạng. Người kia sẽ lao vào tung những cú đấm vật lý dặt dẹo để làm rớt đồ. Hết 30s ai ôm đồ người đó thắng.

---

## 3. Danh Sách Task (Work Breakdown Structure)

### EPIC 1: System Architecture & Setup 
*   [ ] **Task 1.1 - Backend Setup:** Khởi tạo project backend bằng C# (.NET Core). Cấu hình WebSockets/SignalR.
*   [ ] **Task 1.2 - Frontend Lobby:** Dựng base project bằng React + TypeScript. Tạo UI: Home, Create Room, Join Room.
*   [ ] **Task 1.3 - Game Engine Init:** Tạo project Unity (2D/3D mixed). Thiết lập Build Target sang WebGL.
*   [ ] **Task 1.4 - Docker & Môi trường:** Setup Docker compose cho môi trường dev local (C#/.NET, Redis).

### EPIC 2: Web Integration & Face Swap 
*   [ ] **Task 2.1 - Camera API:** Tích hợp `getUserMedia` API vào web React yêu cầu quyền mở Webcam.
*   [ ] **Task 2.2 - Chụp & Crop ảnh:** Viết logic chụp 2-3 biểu cảm. Tự động crop ảnh thành hình vuông/tròn, xóa phông.
*   [ ] **Task 2.3 - Truyền Data:** Gửi chuỗi Base64 của ảnh từ web UI vào trong môi trường Game Client (WebGL).

### EPIC 3: Core Game Mechanics (Game Client) 
*   [ ] **Task 3.1 - Character Controller:** Tạo prefab Người que 2.5D. Gắn 2D Physics Joints tạo hiệu ứng Ragdoll.
*   [ ] **Task 3.2 - Áp ảnh lên mặt:** Viết script nhận Base64 và render lên phần Đầu. Lập trình trigger đổi biểu cảm khi dính bẫy.
*   [ ] **Task 3.3 - Hệ thống Bẫy:** Tạo script cho bẫy (Vỏ chuối, Lò xo). Lập trình logic Collider và AddForce hất văng.
*   [ ] **Task 3.4 - Quản lý Camera:** Viết script Split-screen cho Phase 1, 2 và hàm merge Camera cho Phase 3.
*   [ ] **Task 3.5 - Cơ chế Combat (Punching & Hitbox):** Xây dựng hitbox cho đòn tấn công, tính toán lực vật lý đẩy lùi (Knockback) và hiệu ứng ragdoll tạm thời khi trúng đòn mạnh.
*   [ ] **Task 3.6 - Hệ thống Vật Phẩm (Item System):** Cơ chế cầm/nắm báu vật. Logic tính toán sát thương nhận vào để làm "văng/rớt" Báu Vật Thật ra khỏi tay, cho phép đối phương nhặt lại.
*   [ ] **Task 3.7 - In-game HUD:** Hiển thị đồng hồ đếm ngược (45s cho Phase 1, 30s cho Phase 3).
*   [ ] **Task 3.8 - Chỉ báo trạng thái (Indicators):** Icon nhận diện ai đang cầm Báu Vật Thật, mũi tên chỉ vị trí người chơi kia (nếu màn hình Phase 3 rộng), popup chữ "Phase 1 - GO!".
*   [ ] **Task 3.9 - Màn hình Kết quả (Match Result):** UI vinh danh người thắng (ôm cúp) và animation quê độ/khóc lóc của người thua.
*   [ ] **Task 3.10 - Input Manager:** Định nghĩa phím bấm cho Local Player (Ví dụ: WASD để di chuyển, Space để nhảy, J đấm, K đặt bẫy/nhặt đồ). Hỗ trợ nhận diện Input từ Gamepad (tay cầm).

### EPIC 4: Multiplayer Synchronization 
*   [ ] **Task 4.1 - Sync Vị trí:** Gửi/nhận tọa độ (Transform) qua WebSockets với tick rate 20-30 tick/s.
*   [ ] **Task 4.2 - Sync State Bẫy:** Lưu vị trí bẫy trên Server. Broadcast tín hiệu "Tàng hình" khi sang Phase 2.
*   [ ] **Task 4.3 - Game Flow Manager:** Lập trình Server làm State Machine (Wait Room -> Phase 1 -> Phase 2 -> Phase 3 -> Result).
*   [ ] **Task 4.4 - Xử lý Disconnect/Reconnect:** Logic server sẽ làm gì nếu 1 trong 2 người bị mất mạng đột ngột? (Ví dụ: Dừng game, xử thắng cho người còn lại, trả về Lobby).
*   [ ] **Task 4.5 - Client-side Prediction & Interpolation:** Xử lý nội suy di chuyển để nhân vật bên máy đối phương di chuyển mượt mà, không bị giật cục do ping lag.

### EPIC 5: Audio & Visual Effects (VFX)
*   [ ] **Task 5.1 - Sound Effects (SFX):** Tiếng bước chân lạch bạch, tiếng "boing" của lò xo, tiếng nổ khi mở nhầm đồ giả, tiếng "chát" khi đấm trúng mặt.
*   [ ] **Task 5.2 - Background Music (BGM):** Nhạc lén lút/hồi hộp cho Phase 1 & 2, chuyển sang nhạc dồn dập/hỗn loạn khi bước sang Phase 3.
*   [ ] **Task 5.3 - VFX Particles:** Hiệu ứng nổ xịt đen mặt (kết hợp với đổi biểu cảm avatar ở Task 3.2), bụi bay khi chạy, hiệu ứng chớp nhá (flash) khi dính đòn.
