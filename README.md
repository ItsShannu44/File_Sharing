# MyDocs — Cross-Device File Sharing & Cloud Storage (Windows ⇄ Mobile)

A modern, high-performance local cloud and file-sharing system designed for seamless two-way file transfer between **Windows PC** and **Mobile Devices (iPhone, iPad, Android)**. Features real-time camera QR scanning, instant photo/video transfers, audio/video streaming with seek support, and offline hotspot transfer up to 50 MB/s.

---

## 📱 How Windows ⇄ Mobile Cross Sharing Works

```
┌─────────────────────────────────────────────────────────────────┐
│                       WINDOWS PC (MyDocs)                       │
│  - Displays Live Scannable Connection QR Code                   │
│  - Chimes and shows toast when mobile sends photos              │
│  - Shows "To Phone" QR code next to any file                    │
└────────────────┬───────────────────────────────▲────────────────┘
                 │                               │
                 │ Local Wi-Fi / Hotspot         │ Real-time SSE
                 │ (Direct P2P, No Cloud)        │ Upload / Download
                 ▼                               │
┌────────────────────────────────────────────────┴────────────────┐
│                   MOBILE DEVICE (iPhone / Android)              │
│  - Point camera at PC screen -> Opens in Safari / Chrome        │
│  - Tap "Send Photos & Videos", "Take Live Photo", or "Docs"     │
│  - Direct download button for all files stored on Windows PC    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Step-by-Step: Connect Mobile to Windows PC

### 1. Start the Server on Windows
Double-click **`start.bat`** (or run `node server.js`).
Your browser will open to `http://localhost:5000`.

### 2. Connect Your Phone
1. Ensure both your **Windows PC** and **Mobile Phone** are connected to the **same Wi-Fi network** (or see *Hotspot Mode* below).
2. On your Windows PC screen, click the **"Share to Device"** button at the top right.
3. Open the **Camera app** on your iPhone or Android phone.
4. Point the camera at the **QR Code** on your PC screen.
5. Tap the link notification that appears (e.g. `http://10.191.21.121:5000`).

---

## 🔄 Two-Way Transfer Features

### A. Mobile ➔ Windows PC (Upload from Phone)
1. On your phone's browser, tap any of the quick-action buttons:
   - 📸 **Send Photos & Videos**: Select multiple items from your phone's photo library.
   - 📷 **Take Live Photo**: Opens phone camera, snaps a photo, and transfers it instantly.
   - 📁 **Send Documents**: Select PDFs, archives, or files from your phone's storage.
2. Watch the progress bar fill up.
3. **Instantly on your Windows PC**:
   - A soft chime plays.
   - A notification toast pops up: *"📱 Received photo from Mobile! Saved to PC."*
   - The file appears in **Recent Files** and in the **"File Received"** timeline!
   - Stored directly in the `uploads/` folder on your computer.

### B. Windows PC ➔ Mobile (Send File to Phone)
1. On your Windows PC screen, find any file in the **Recent Files** list.
2. Click the **"📲 To Phone"** button next to that file.
3. A unique download QR code appears for that exact file.
4. Scan it with your phone camera to download it straight into your phone's Photos or Files!

---

## 📶 No Wi-Fi? Offline Hotspot Mode (Fastest: 30–50 MB/s)

If you are traveling, on a hotel/university Wi-Fi that blocks device-to-device communication, or have no router:
1. Turn on **Personal Hotspot** on your phone, and connect your Windows PC to your phone's Wi-Fi.  
   *(OR turn on **Mobile Hotspot** in Windows Settings and connect your phone to your PC).*
2. Open MyDocs on your PC, click **"Share to Device"**, and scan the QR code.
3. You now have an ultra-fast, direct local wireless transfer bridge with **zero internet data usage**!

---

## 🛡️ Troubleshooting Mobile Connection

If your phone says *"Safari/Chrome cannot open the page because the server stopped responding"*:
1. Windows Defender Firewall may be blocking incoming connections on port 5000.
2. Simply double-click **`allow-firewall.bat`** in the project folder to add an automatic firewall allow rule.
3. Make sure your PC and phone are on the same Wi-Fi network or connected via Hotspot.

---

## 📂 Project Structure

```
MyDocs-File-Sharing-System/
├── public/
│   ├── index.html              # UI with Mobile Transfer Hub & responsive layouts
│   ├── css/
│   │   └── style.css           # Neo-soft responsive theme, QR styles & animations
│   ├── js/
│   │   ├── app.js              # State manager, live SSE updates, audio chime, QR logic
│   │   └── qrcode.min.js       # Zero-dependency QR Code generator
│   └── assets/
│       └── sample-media/       # Generated sample video (glitter.mp4), audio, photos
├── server.js                   # Node.js server with smart Wi-Fi IP detection & streaming
├── data/
│   └── db.json                 # Persistent database seeded with initial design data
├── uploads/                    # Physical uploaded file storage directory
├── allow-firewall.bat          # 1-click Windows Firewall rule helper
├── start.bat                   # 1-click Windows launcher
├── start.sh                    # 1-click macOS/Linux launcher
├── package.json                # Project manifest
└── README.md                   # Full cross-device documentation
```
