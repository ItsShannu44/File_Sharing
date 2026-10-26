const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.ico': 'image/x-icon'
};

// Database helper functions
function readDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading db:', err);
  }
  return { files: [], downloads: [], timeline: [], storageStats: {} };
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db:', err);
  }
}

// Connected devices registry
const connectedDevices = new Map(); // clientId -> { id, name, type, ip, res, joinedAt }

function broadcastEvent(eventType, payload, excludeClientId = null) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [cId, dev] of connectedDevices.entries()) {
    if (excludeClientId && cId === excludeClientId) continue;
    try {
      dev.res.write(message);
    } catch (e) {
      connectedDevices.delete(cId);
    }
  }
}

function sendToDevice(targetClientId, eventType, payload) {
  const dev = connectedDevices.get(targetClientId);
  if (dev && dev.res) {
    try {
      dev.res.write(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
      return true;
    } catch (e) {
      connectedDevices.delete(targetClientId);
    }
  }
  return false;
}

// Detect category from filename extension
function getCategoryFromFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext)) return 'image';
  if (['.mp4', '.mkv', '.mov', '.webm', '.avi'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(ext)) return 'music';
  if (['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.pptx', '.md'].includes(ext)) return 'docs';
  if (['.exe', '.apk', '.dmg', '.iso', '.zip', '.tar', '.gz'].includes(ext)) return 'apps';
  return 'docs';
}

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Active in-progress download simulations
const activeDownloads = new Map();

function startDownloadSimulator(downloadId) {
  const db = readDb();
  const dl = db.downloads.find(d => d.id === downloadId);
  if (!dl) return;

  dl.status = 'active';
  dl.statusText = `Downloading ${dl.progress || 1}%`;
  writeDb(db);
  broadcastEvent('download_updated', dl);

  if (activeDownloads.has(downloadId)) {
    clearInterval(activeDownloads.get(downloadId));
  }

  const interval = setInterval(() => {
    const currentDb = readDb();
    const item = currentDb.downloads.find(d => d.id === downloadId);
    if (!item || item.status !== 'active') {
      clearInterval(interval);
      activeDownloads.delete(downloadId);
      return;
    }

    item.progress = Math.min(100, (item.progress || 0) + 4);
    item.speed = `${(2.0 + Math.random() * 0.8).toFixed(1)} MB/s`;
    item.statusText = item.progress >= 100 ? 'Completed' : `Downloading ${item.progress}%`;

    if (item.progress >= 100) {
      item.status = 'completed';
      clearInterval(interval);
      activeDownloads.delete(downloadId);
    }

    writeDb(currentDb);
    broadcastEvent('download_updated', item);
  }, 500);

  activeDownloads.set(downloadId, interval);
}

function pauseDownloadSimulator(downloadId) {
  if (activeDownloads.has(downloadId)) {
    clearInterval(activeDownloads.get(downloadId));
    activeDownloads.delete(downloadId);
  }
  const db = readDb();
  const dl = db.downloads.find(d => d.id === downloadId);
  if (dl) {
    dl.status = 'paused';
    dl.statusText = `Paused at ${dl.progress}%`;
    dl.speed = '0 KB/s';
    writeDb(db);
    broadcastEvent('download_updated', dl);
  }
}

// Get all candidate IPv4 network interfaces, prioritizing Wi-Fi and Ethernet
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Skip 169.254.x.x link-local autoconfiguration addresses
        if (iface.address.startsWith('169.254.')) continue;
        const isWifi = /wi-?fi|wireless|wlan/i.test(name);
        const isHotspot = /hotspot|hosted/i.test(name);
        const isEthernet = /ethernet|eth|en/i.test(name);
        let priority = 5;
        if (isWifi) priority = 10;
        else if (isHotspot) priority = 9;
        else if (isEthernet) priority = 8;
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) priority += 2;

        candidates.push({
          name: name,
          ip: iface.address,
          isWifi: isWifi,
          isEthernet: isEthernet,
          priority: priority
        });
      }
    }
  }
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates;
}

function getLocalIp() {
  const ips = getNetworkIps();
  if (ips.length > 0) return ips[0].ip;
  return 'localhost';
}

// Streaming video/audio server with HTTP Range requests
function serveFileWithRange(req, res, filePath, contentType) {
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('File Not Found');
    }

    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

// Request dispatcher
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, X-File-Name, X-File-Category');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // SSE (Server-Sent Events) for real-time synchronization & device pairing
  if (pathname === '/api/events') {
    const clientId = parsedUrl.query.clientId || `dev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const isMobile = /mobile|iphone|ipad|android/i.test(req.headers['user-agent'] || '');
    const deviceName = decodeURIComponent(parsedUrl.query.name || (isMobile ? 'Mobile Phone' : 'Windows PC'));
    const deviceType = parsedUrl.query.type || (isMobile ? 'mobile' : 'desktop');
    const clientIp = req.socket.remoteAddress || '127.0.0.1';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const deviceObj = {
      id: clientId,
      name: deviceName,
      type: deviceType,
      ip: clientIp,
      res: res,
      joinedAt: Date.now()
    };

    connectedDevices.set(clientId, deviceObj);

    const getCleanDevicesList = () => Array.from(connectedDevices.values()).map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      ip: d.ip
    }));

    // Send initial handshake with assigned ID and currently connected devices
    res.write(`event: connected\ndata: ${JSON.stringify({
      status: "connected",
      assignedId: clientId,
      devices: getCleanDevicesList()
    })}\n\n`);

    // Notify other connected devices that a new sender/receiver has joined
    broadcastEvent('device_list_updated', {
      devices: getCleanDevicesList()
    });

    req.on('close', () => {
      connectedDevices.delete(clientId);
      broadcastEvent('device_list_updated', {
        devices: getCleanDevicesList()
      });
    });
    return;
  }

  // GET /api/devices - Get list of currently connected sender & receiver devices
  if (pathname === '/api/devices' && req.method === 'GET') {
    const devs = Array.from(connectedDevices.values()).map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      ip: d.ip
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(devs));
  }

  // POST /api/transfer/send - Beam an existing file directly to a target receiver device
  if (pathname === '/api/transfer/send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { fileId, targetDevice, senderId, senderName, senderType } = payload;
        const db = readDb();
        const targetFile = db.files.find(f => f.id === fileId);

        if (!targetFile) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'File not found' }));
        }

        const transferPayload = {
          transferId: `trans-${Date.now()}`,
          senderId: senderId,
          senderName: senderName || 'Connected Device',
          senderType: senderType || 'desktop',
          targetDevice: targetDevice,
          file: {
            id: targetFile.id,
            name: targetFile.name,
            displayName: targetFile.displayName,
            category: targetFile.category,
            size: targetFile.size,
            sizeFormatted: targetFile.sizeFormatted,
            fileUrl: targetFile.fileUrl,
            downloadUrl: `/api/download/${encodeURIComponent(targetFile.name)}`,
            thumbnailUrl: targetFile.thumbnailUrl
          },
          autoDownload: true,
          timestamp: Date.now()
        };

        if (targetDevice && targetDevice !== 'all') {
          const sent = sendToDevice(targetDevice, 'incoming_file_targeted', transferPayload);
          if (!sent) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Target receiver device is offline or not found' }));
          }
        } else {
          broadcastEvent('incoming_file_targeted', transferPayload, senderId);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, transfer: transferPayload }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/files - Get all files with optional filter & search
  if (pathname === '/api/files' && req.method === 'GET') {
    const db = readDb();
    let result = db.files || [];
    const category = parsedUrl.query.category;
    const search = (parsedUrl.query.search || '').trim().toLowerCase();

    if (category && category !== 'all') {
      result = result.filter(f => f.category === category);
    }
    if (search) {
      result = result.filter(f =>
        f.name.toLowerCase().includes(search) ||
        (f.displayName && f.displayName.toLowerCase().includes(search))
      );
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ files: result, total: result.length }));
  }

  // GET /api/downloads - Get current download queue
  if (pathname === '/api/downloads' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(db.downloads || []));
  }

  // POST /api/downloads/action - Control download items (start, pause, resume, add)
  if (pathname === '/api/downloads/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { action, downloadId, fileId } = payload;
        const db = readDb();

        if (action === 'start' || action === 'resume') {
          startDownloadSimulator(downloadId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, status: 'active' }));
        } else if (action === 'pause') {
          pauseDownloadSimulator(downloadId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, status: 'paused' }));
        } else if (action === 'add') {
          // Add file to downloads queue
          const targetFile = db.files.find(f => f.id === fileId);
          if (targetFile) {
            const newDl = {
              id: `dl-${Date.now()}`,
              fileName: targetFile.name,
              fileSize: targetFile.sizeFormatted,
              sizeBytes: targetFile.size,
              status: 'waiting',
              statusText: 'Waiting for download',
              progress: 0,
              speed: '0 KB/s',
              dateGroup: 'Today',
              fileUrl: targetFile.fileUrl
            };
            db.downloads.unshift(newDl);
            writeDb(db);
            broadcastEvent('download_added', newDl);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, download: newDl }));
          }
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid action or parameters' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/timeline - Get file received timeline records
  if (pathname === '/api/timeline' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(db.timeline || []));
  }

  // GET /api/stats - Storage statistics and system info
  if (pathname === '/api/stats' && req.method === 'GET') {
    const db = readDb();
    const networkIps = getNetworkIps();
    const localIp = networkIps.length > 0 ? networkIps[0].ip : 'localhost';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      storage: db.storageStats || {},
      localIp: localIp,
      networkIps: networkIps,
      port: PORT,
      shareUrl: `http://${localIp}:${PORT}`
    }));
  }

  // POST /api/upload - Handle file upload (Streaming or Multipart)
  if (pathname === '/api/upload' && req.method === 'POST') {
    const contentType = req.headers['content-type'] || '';
    const senderId = req.headers['x-sender-id'] || null;
    const senderName = decodeURIComponent(req.headers['x-sender-name'] || 'Connected Device');
    const senderType = req.headers['x-sender-type'] || 'desktop';
    const targetDevice = req.headers['x-target-device'] || 'all';

    // Helper to notify receiver
    const notifyReceiversOfFile = (file) => {
      const transferNotice = {
        transferId: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        senderId: senderId,
        senderName: senderName,
        senderType: senderType,
        targetDevice: targetDevice,
        file: {
          id: file.id,
          name: file.name,
          displayName: file.displayName,
          category: file.category,
          size: file.size,
          sizeFormatted: file.sizeFormatted,
          fileUrl: file.fileUrl,
          downloadUrl: `/api/download/${encodeURIComponent(file.name)}`,
          thumbnailUrl: file.thumbnailUrl
        },
        autoDownload: true,
        timestamp: Date.now()
      };

      if (targetDevice && targetDevice !== 'all') {
        sendToDevice(targetDevice, 'incoming_file_targeted', transferNotice);
      } else {
        broadcastEvent('incoming_file_targeted', transferNotice, senderId);
      }
    };
    
    // Check if direct binary stream upload
    if (!contentType.includes('multipart/form-data')) {
      const originalName = decodeURIComponent(req.headers['x-file-name'] || `file_${Date.now()}`);
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const targetPath = path.join(UPLOADS_DIR, safeName);
      const writeStream = fs.createWriteStream(targetPath);
      let bytesReceived = 0;

      req.on('data', chunk => {
        bytesReceived += chunk.length;
        writeStream.write(chunk);
      });

      req.on('end', () => {
        writeStream.end();
        const category = getCategoryFromFilename(safeName);
        const db = readDb();
        const now = new Date();
        const timeFormatted = now.toTimeString().slice(0, 5);

        const newFile = {
          id: `file-${Date.now()}`,
          name: safeName,
          displayName: safeName.replace(/\.[^/.]+$/, ''),
          category: category,
          size: bytesReceived,
          sizeFormatted: formatBytes(bytesReceived),
          duration: category === 'video' ? '01:30' : (category === 'music' ? '03:15' : null),
          thumbnailUrl: category === 'image' ? `/uploads/${safeName}` : `/assets/sample-media/timeline-2.jpg`,
          fileUrl: `/uploads/${safeName}`,
          mimeType: MIME_TYPES[path.extname(safeName).toLowerCase()] || 'application/octet-stream',
          previewFeatured: false,
          createdAt: now.toISOString()
        };

        db.files.unshift(newFile);

        // Add to timeline
        const newTimelineEvent = {
          id: `tl-${Date.now()}`,
          startTime: timeFormatted,
          endTime: timeFormatted,
          title: `Received 1 ${category.charAt(0).toUpperCase() + category.slice(1)} from ${senderName}`,
          count: 1,
          totalSize: formatBytes(bytesReceived),
          thumbnails: [newFile.thumbnailUrl],
          receivedAt: now.toISOString()
        };
        db.timeline.unshift(newTimelineEvent);

        writeDb(db);
        broadcastEvent('file_uploaded', newFile);
        broadcastEvent('timeline_added', newTimelineEvent);

        // Deliver directly to the receiver device!
        notifyReceiversOfFile(newFile);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, file: newFile }));
      });
      return;
    }

    // Multipart form data handler
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing boundary in multipart request' }));
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const fullBuffer = Buffer.concat(chunks);
        const boundaryBuffer = Buffer.from(`--${boundary}`);
        let start = 0;
        let uploadedFiles = [];

        while (true) {
          const boundaryIndex = fullBuffer.indexOf(boundaryBuffer, start);
          if (boundaryIndex === -1) break;
          const nextBoundaryIndex = fullBuffer.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
          if (nextBoundaryIndex === -1) break;

          const partBuffer = fullBuffer.slice(boundaryIndex + boundaryBuffer.length, nextBoundaryIndex);
          const headerEndIndex = partBuffer.indexOf('\r\n\r\n');
          if (headerEndIndex !== -1) {
            const headerText = partBuffer.slice(0, headerEndIndex).toString('utf-8');
            const fileMatch = headerText.match(/filename="([^"]+)"/i);
            if (fileMatch) {
              const filename = fileMatch[1].replace(/[^a-zA-Z0-9._-]/g, '_');
              const fileContent = partBuffer.slice(headerEndIndex + 4, partBuffer.length - 2);
              const savePath = path.join(UPLOADS_DIR, filename);
              fs.writeFileSync(savePath, fileContent);

              const category = getCategoryFromFilename(filename);
              uploadedFiles.push({
                name: filename,
                size: fileContent.length,
                category: category
              });
            }
          }
          start = nextBoundaryIndex;
        }

        if (uploadedFiles.length > 0) {
          const db = readDb();
          const now = new Date();
          const timeFormatted = now.toTimeString().slice(0, 5);
          let totalBytes = 0;
          const createdFiles = [];

          for (const item of uploadedFiles) {
            totalBytes += item.size;
            const newFile = {
              id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: item.name,
              displayName: item.name.replace(/\.[^/.]+$/, ''),
              category: item.category,
              size: item.size,
              sizeFormatted: formatBytes(item.size),
              duration: item.category === 'video' ? '01:30' : null,
              thumbnailUrl: item.category === 'image' ? `/uploads/${item.name}` : `/assets/sample-media/timeline-3.jpg`,
              fileUrl: `/uploads/${item.name}`,
              mimeType: MIME_TYPES[path.extname(item.name).toLowerCase()] || 'application/octet-stream',
              previewFeatured: false,
              createdAt: now.toISOString()
            };
            db.files.unshift(newFile);
            createdFiles.push(newFile);
            broadcastEvent('file_uploaded', newFile);

            // Deliver directly to target receiver!
            notifyReceiversOfFile(newFile);
          }

          const newTimelineEvent = {
            id: `tl-${Date.now()}`,
            startTime: timeFormatted,
            endTime: timeFormatted,
            title: `Received ${createdFiles.length} ${createdFiles.length === 1 ? 'File' : 'Files'} from ${senderName}`,
            count: createdFiles.length,
            totalSize: formatBytes(totalBytes),
            thumbnails: createdFiles.map(f => f.thumbnailUrl || '/assets/sample-media/timeline-1.jpg').slice(0, 3),
            receivedAt: now.toISOString()
          };
          db.timeline.unshift(newTimelineEvent);
          writeDb(db);
          broadcastEvent('timeline_added', newTimelineEvent);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, files: createdFiles }));
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No files parsed from upload' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/files/:id - Remove file
  if (pathname.startsWith('/api/files/') && req.method === 'DELETE') {
    const fileId = pathname.replace('/api/files/', '');
    const db = readDb();
    const index = db.files.findIndex(f => f.id === fileId);
    if (index !== -1) {
      const removed = db.files.splice(index, 1)[0];
      writeDb(db);
      broadcastEvent('file_deleted', { id: fileId });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, removed }));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'File not found' }));
  }

  // Direct download endpoint with Content-Disposition
  if (pathname.startsWith('/api/download/')) {
    const requestedFileName = decodeURIComponent(pathname.replace('/api/download/', ''));
    const filePath = path.join(UPLOADS_DIR, requestedFileName);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${requestedFileName}"`);
      const ext = path.extname(requestedFileName).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      return serveFileWithRange(req, res, filePath, contentType);
    } else {
      // Check in sample-media
      const samplePath = path.join(PUBLIC_DIR, 'assets', 'sample-media', requestedFileName);
      if (fs.existsSync(samplePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${requestedFileName}"`);
        const ext = path.extname(requestedFileName).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        return serveFileWithRange(req, res, samplePath, contentType);
      }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('File Not Found');
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVING
  // -------------------------------------------------------------

  let targetPath = '';
  if (pathname.startsWith('/uploads/')) {
    targetPath = path.join(UPLOADS_DIR, decodeURIComponent(pathname.replace('/uploads/', '')));
  } else {
    const safePath = pathname === '/' ? 'index.html' : pathname;
    targetPath = path.join(PUBLIC_DIR, decodeURIComponent(safePath));
  }

  // Check if file exists
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Enable Range requests for video/audio streaming
    if (['.mp4', '.webm', '.mp3', '.wav'].includes(ext)) {
      return serveFileWithRange(req, res, targetPath, contentType);
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    });
    return fs.createReadStream(targetPath).pipe(res);
  }

  // Fallback to index.html for Single Page Application navigation
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return fs.createReadStream(indexPath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  const networkIps = getNetworkIps();
  const primaryIp = networkIps.length > 0 ? networkIps[0].ip : 'localhost';
  console.log('================================================================');
  console.log('  🚀 MyDocs Windows <-> Mobile Cross-Device Sharing System Live!');
  console.log(`  👉 Windows Local URL:  http://localhost:${PORT}`);
  console.log(`  👉 Mobile & LAN URL:   http://${primaryIp}:${PORT}`);
  if (networkIps.length > 1) {
    console.log('  👉 Other Network IPs:');
    networkIps.slice(1).forEach(n => console.log(`     - ${n.name}: http://${n.ip}:${PORT}`));
  }
  console.log('  👉 Point your phone camera at the QR code on screen to connect!');
  console.log('================================================================');
});
