/**
 * MyDocs - Client Application Controller
 * Handles real-time SSE updates, media previews, download manager,
 * category filtering, drag-and-drop uploads, and Sender/Receiver targeted file dispatch.
 */

class MyDocsApp {
  constructor() {
    this.files = [];
    this.downloads = [];
    this.timeline = [];
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.currentShareUrl = '';
    this.networkIps = [];
    this.sse = null;

    // Device Identification & Pairing State
    this.deviceId = localStorage.getItem('mydocs_device_id') || `dev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    localStorage.setItem('mydocs_device_id', this.deviceId);

    const isMobile = /mobile|iphone|ipad|android/i.test(navigator.userAgent);
    const defaultName = isMobile ? (navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Android Phone') : 'Windows PC';
    this.deviceName = localStorage.getItem('mydocs_device_name') || defaultName;
    this.deviceType = isMobile ? 'mobile' : 'desktop';
    this.currentRole = 'dual'; // 'dual', 'sender', 'receiver'
    this.targetReceiverId = 'all';
    this.autoDownloadEnabled = localStorage.getItem('mydocs_auto_download') !== 'false';
    this.connectedDevicesList = [];
    this.pendingTransfer = null;

    this.initElements();
    this.initEventListeners();
    this.initDragAndDrop();
    this.initSSE();
    this.loadInitialData();
    this.loadSystemStats();
  }

  initElements() {
    this.searchInput = document.getElementById('searchInput');
    this.searchSubmitBtn = document.getElementById('searchSubmitBtn');
    this.categoryItems = document.querySelectorAll('.category-item');
    this.activeFilterBadge = document.getElementById('activeFilterBadge');
    this.filterCategoryName = document.getElementById('filterCategoryName');
    this.clearFilterBtn = document.getElementById('clearFilterBtn');

    this.filesTableBody = document.getElementById('filesTableBody');
    this.filesCountBadge = document.getElementById('filesCountBadge');

    this.todayDownloadsList = document.getElementById('todayDownloadsList');
    this.yesterdayDownloadsList = document.getElementById('yesterdayDownloadsList');
    this.timelineList = document.getElementById('timelineList');

    this.triggerUploadBtn = document.getElementById('triggerUploadBtn');
    this.hiddenFileInput = document.getElementById('hiddenFileInput');
    this.dropZonePrompt = document.getElementById('dropZonePrompt');

    this.mediaModal = document.getElementById('mediaModal');
    this.modalMediaTitle = document.getElementById('modalMediaTitle');
    this.modalMediaBody = document.getElementById('modalMediaBody');
    this.closeMediaModalBtn = document.getElementById('closeMediaModalBtn');

    // Share Modal Elements
    this.shareModal = document.getElementById('shareModal');
    this.openShareModalBtn = document.getElementById('openShareModalBtn');
    this.closeShareModalBtn = document.getElementById('closeShareModalBtn');
    this.networkShareUrl = document.getElementById('networkShareUrl');
    this.copyUrlBtn = document.getElementById('copyUrlBtn');
    this.mobileQrCode = document.getElementById('mobileQrCode');
    this.adapterSelectRow = document.getElementById('adapterSelectRow');
    this.networkIpSelect = document.getElementById('networkIpSelect');
    this.modalTabs = document.querySelectorAll('.modal-tab');

    // File Specific QR Modal
    this.fileQrModal = document.getElementById('fileQrModal');
    this.fileQrTitle = document.getElementById('fileQrTitle');
    this.fileQrFileName = document.getElementById('fileQrFileName');
    this.singleFileQrCode = document.getElementById('singleFileQrCode');
    this.fileQrDownloadUrl = document.getElementById('fileQrDownloadUrl');
    this.copyFileUrlBtn = document.getElementById('copyFileUrlBtn');
    this.closeFileQrModalBtn = document.getElementById('closeFileQrModalBtn');

    // Sender & Receiver Role Bar Elements
    this.myDeviceName = document.getElementById('myDeviceName');
    this.myDeviceIcon = document.getElementById('myDeviceIcon');
    this.editDeviceNameBtn = document.getElementById('editDeviceNameBtn');
    this.rolePillBtns = document.querySelectorAll('.role-pill-btn');
    this.targetReceiverSelect = document.getElementById('targetReceiverSelect');

    // Dedicated Receiver Station View Elements
    this.receiverStationView = document.getElementById('receiverStationView');
    this.standardViewContainer = document.getElementById('standardViewContainer');
    this.stationAutoDownload = document.getElementById('stationAutoDownload');
    this.stationFilesList = document.getElementById('stationFilesList');

    // Incoming Transfer Modal (Popup on Receiver Device)
    this.incomingTransferModal = document.getElementById('incomingTransferModal');
    this.incomingFileNameText = document.getElementById('incomingFileNameText');
    this.incomingSenderText = document.getElementById('incomingSenderText');
    this.confirmAcceptDownloadBtn = document.getElementById('confirmAcceptDownloadBtn');
    this.dismissTransferBtn = document.getElementById('dismissTransferBtn');
    this.closeIncomingModalBtn = document.getElementById('closeIncomingModalBtn');
    this.rememberAutoSaveCheckbox = document.getElementById('rememberAutoSaveCheckbox');

    // Mobile Hub Elements
    this.mobileUploadPhotosBtn = document.getElementById('mobileUploadPhotosBtn');
    this.mobileUploadCameraBtn = document.getElementById('mobileUploadCameraBtn');
    this.mobileUploadDocsBtn = document.getElementById('mobileUploadDocsBtn');
    this.mobilePhotoInput = document.getElementById('mobilePhotoInput');
    this.mobileCameraInput = document.getElementById('mobileCameraInput');
    this.mobileDocInput = document.getElementById('mobileDocInput');

    this.uploadToast = document.getElementById('uploadToast');
    this.uploadToastTitle = document.getElementById('uploadToastTitle');
    this.uploadToastFill = document.getElementById('uploadToastFill');

    this.previewGallery = document.getElementById('previewGallery');
    this.viewInFoldersLink = document.getElementById('viewInFoldersLink');
    this.navItems = document.querySelectorAll('.nav-item[data-nav]');

    // Render local device name
    if (this.myDeviceName) this.myDeviceName.textContent = this.deviceName;
    if (this.myDeviceIcon) this.myDeviceIcon.textContent = this.deviceType === 'mobile' ? '📱' : '💻';
    if (this.stationAutoDownload) this.stationAutoDownload.checked = this.autoDownloadEnabled;
    if (this.rememberAutoSaveCheckbox) this.rememberAutoSaveCheckbox.checked = this.autoDownloadEnabled;
  }

  initEventListeners() {
    // Search input
    let searchTimeout;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderFilesTable();
      }, 150);
    });

    // Quick Access category filters
    this.categoryItems.forEach(item => {
      item.addEventListener('click', () => {
        const cat = item.getAttribute('data-category');
        if (this.currentCategory === cat) {
          this.setCategory('all');
        } else {
          this.setCategory(cat);
        }
      });
    });

    this.clearFilterBtn.addEventListener('click', () => {
      this.setCategory('all');
    });

    // Device name edit button
    if (this.editDeviceNameBtn) {
      this.editDeviceNameBtn.addEventListener('click', () => {
        const newName = prompt('Enter a friendly name for this device:', this.deviceName);
        if (newName && newName.trim()) {
          this.deviceName = newName.trim();
          localStorage.setItem('mydocs_device_name', this.deviceName);
          this.myDeviceName.textContent = this.deviceName;
          // Reconnect SSE to broadcast updated name
          if (this.sse) this.sse.close();
          this.initSSE();
        }
      });
    }

    // Role Mode Selector (Dual, Sender, Receiver Station)
    this.rolePillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.rolePillBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const role = btn.getAttribute('data-role');
        this.setRoleMode(role);
      });
    });

    // Target Receiver Dropdown
    if (this.targetReceiverSelect) {
      this.targetReceiverSelect.addEventListener('change', (e) => {
        this.targetReceiverId = e.target.value;
      });
    }

    // Auto-save toggle in Station view
    if (this.stationAutoDownload) {
      this.stationAutoDownload.addEventListener('change', (e) => {
        this.autoDownloadEnabled = e.target.checked;
        localStorage.setItem('mydocs_auto_download', this.autoDownloadEnabled);
        if (this.rememberAutoSaveCheckbox) this.rememberAutoSaveCheckbox.checked = this.autoDownloadEnabled;
      });
    }

    if (this.rememberAutoSaveCheckbox) {
      this.rememberAutoSaveCheckbox.addEventListener('change', (e) => {
        this.autoDownloadEnabled = e.target.checked;
        localStorage.setItem('mydocs_auto_download', this.autoDownloadEnabled);
        if (this.stationAutoDownload) this.stationAutoDownload.checked = this.autoDownloadEnabled;
      });
    }

    // Incoming Transfer Modal Accept / Dismiss
    if (this.confirmAcceptDownloadBtn) {
      this.confirmAcceptDownloadBtn.addEventListener('click', () => {
        if (this.pendingTransfer && this.pendingTransfer.file) {
          this.downloadDirectly(this.pendingTransfer.file.downloadUrl, this.pendingTransfer.file.name);
          this.addFileToStationList(this.pendingTransfer.file, this.pendingTransfer.senderName);
        }
        this.incomingTransferModal.style.display = 'none';
        this.pendingTransfer = null;
      });
    }

    if (this.dismissTransferBtn) {
      this.dismissTransferBtn.addEventListener('click', () => {
        this.incomingTransferModal.style.display = 'none';
        this.pendingTransfer = null;
      });
    }

    if (this.closeIncomingModalBtn) {
      this.closeIncomingModalBtn.addEventListener('click', () => {
        this.incomingTransferModal.style.display = 'none';
        this.pendingTransfer = null;
      });
    }

    // Upload triggers
    this.triggerUploadBtn.addEventListener('click', () => this.hiddenFileInput.click());
    this.dropZonePrompt.addEventListener('click', () => this.hiddenFileInput.click());
    this.hiddenFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.uploadFiles(Array.from(e.target.files));
      }
    });

    // Mobile Hub upload triggers
    if (this.mobileUploadPhotosBtn) {
      this.mobileUploadPhotosBtn.addEventListener('click', () => this.mobilePhotoInput.click());
      this.mobilePhotoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) this.uploadFiles(Array.from(e.target.files));
      });
    }

    if (this.mobileUploadCameraBtn) {
      this.mobileUploadCameraBtn.addEventListener('click', () => this.mobileCameraInput.click());
      this.mobileCameraInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) this.uploadFiles(Array.from(e.target.files));
      });
    }

    if (this.mobileUploadDocsBtn) {
      this.mobileUploadDocsBtn.addEventListener('click', () => this.mobileDocInput.click());
      this.mobileDocInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) this.uploadFiles(Array.from(e.target.files));
      });
    }

    // Preview gallery cards
    const previewCards = document.querySelectorAll('.preview-card');
    previewCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const title = card.getAttribute('data-title');
        const videoUrl = card.getAttribute('data-video-url');
        this.openMediaModal(title, videoUrl, 'video');
      });
    });

    // Modal close listeners
    this.closeMediaModalBtn.addEventListener('click', () => this.closeMediaModal());
    this.mediaModal.addEventListener('click', (e) => {
      if (e.target === this.mediaModal) this.closeMediaModal();
    });

    // Share Modal Open & Tab Switching
    this.openShareModalBtn.addEventListener('click', () => {
      this.shareModal.style.display = 'flex';
      this.renderShareQr();
    });
    this.closeShareModalBtn.addEventListener('click', () => {
      this.shareModal.style.display = 'none';
    });
    this.shareModal.addEventListener('click', (e) => {
      if (e.target === this.shareModal) this.shareModal.style.display = 'none';
    });

    // Modal tabs
    this.modalTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.modalTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetTabId = tab.getAttribute('data-tab');

        document.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
        const targetPane = document.getElementById(targetTabId);
        if (targetPane) targetPane.style.display = 'block';

        if (targetTabId === 'tab-qr') {
          this.renderShareQr();
        }
      });
    });

    // Network Adapter Dropdown selection
    if (this.networkIpSelect) {
      this.networkIpSelect.addEventListener('change', (e) => {
        const selectedIp = e.target.value;
        const port = window.location.port || '5000';
        this.currentShareUrl = `http://${selectedIp}:${port}`;
        this.networkShareUrl.value = this.currentShareUrl;
        this.renderShareQr();
      });
    }

    // Copy LAN URL button
    this.copyUrlBtn.addEventListener('click', () => {
      this.networkShareUrl.select();
      navigator.clipboard.writeText(this.networkShareUrl.value);
      this.copyUrlBtn.textContent = 'Copied!';
      setTimeout(() => this.copyUrlBtn.textContent = 'Copy Link', 2000);
    });

    // File Specific QR modal
    if (this.closeFileQrModalBtn) {
      this.closeFileQrModalBtn.addEventListener('click', () => this.fileQrModal.style.display = 'none');
      this.fileQrModal.addEventListener('click', (e) => {
        if (e.target === this.fileQrModal) this.fileQrModal.style.display = 'none';
      });
    }

    if (this.copyFileUrlBtn) {
      this.copyFileUrlBtn.addEventListener('click', () => {
        this.fileQrDownloadUrl.select();
        navigator.clipboard.writeText(this.fileQrDownloadUrl.value);
        this.copyFileUrlBtn.textContent = 'Copied!';
        setTimeout(() => this.copyFileUrlBtn.textContent = 'Copy', 2000);
      });
    }

    // Sidebar navigation items
    this.navItems.forEach(nav => {
      nav.addEventListener('click', () => {
        this.navItems.forEach(n => n.classList.remove('active'));
        nav.classList.add('active');
        const navTarget = nav.getAttribute('data-nav');
        if (navTarget === 'folders') {
          this.setCategory('docs');
        } else if (navTarget === 'dashboard') {
          this.setCategory('all');
        } else if (navTarget === 'storage') {
          this.openShareModalBtn.click();
        }
      });
    });

    this.viewInFoldersLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.setCategory('video');
    });

    // Keyboard ESC to close modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMediaModal();
        this.shareModal.style.display = 'none';
        if (this.fileQrModal) this.fileQrModal.style.display = 'none';
        if (this.incomingTransferModal) this.incomingTransferModal.style.display = 'none';
      }
    });
  }

  setRoleMode(role) {
    this.currentRole = role;
    if (role === 'receiver') {
      if (this.standardViewContainer) this.standardViewContainer.style.display = 'none';
      if (this.receiverStationView) this.receiverStationView.style.display = 'block';
    } else {
      if (this.standardViewContainer) this.standardViewContainer.style.display = 'block';
      if (this.receiverStationView) this.receiverStationView.style.display = 'none';
    }
  }

  playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}

    // Vibrate on mobile devices if supported
    if (navigator.vibrate) {
      try { navigator.vibrate([150, 80, 150]); } catch (e) {}
    }
  }

  renderShareQr() {
    if (!this.mobileQrCode || !window.QRCode) return;
    const url = this.currentShareUrl || this.networkShareUrl.value || window.location.origin;
    this.mobileQrCode.innerHTML = '';
    new window.QRCode(this.mobileQrCode, {
      text: url,
      width: 170,
      height: 170,
      colorDark: '#0F172A',
      colorLight: '#FFFFFF'
    });
  }

  showFileQr(fileName) {
    if (!this.fileQrModal || !window.QRCode) return;
    const baseUrl = this.currentShareUrl || this.networkShareUrl.value || window.location.origin;
    const downloadUrl = `${baseUrl}/api/download/${encodeURIComponent(fileName)}`;

    this.fileQrTitle.textContent = `Send to Phone: ${fileName}`;
    this.fileQrFileName.textContent = fileName;
    this.fileQrDownloadUrl.value = downloadUrl;

    this.singleFileQrCode.innerHTML = '';
    new window.QRCode(this.singleFileQrCode, {
      text: downloadUrl,
      width: 170,
      height: 170,
      colorDark: '#0F172A',
      colorLight: '#FFFFFF'
    });

    this.fileQrModal.style.display = 'flex';
  }

  // Beam an existing file to the selected target receiver device
  async beamFileToReceiver(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;

    const targetDevId = this.targetReceiverId;
    const targetName = this.targetReceiverSelect ? this.targetReceiverSelect.options[this.targetReceiverSelect.selectedIndex].text : 'Receiver';

    this.uploadToast.style.display = 'flex';
    this.uploadToastTitle.textContent = `🚀 Beaming "${file.displayName || file.name}" to ${targetName}...`;
    this.uploadToastFill.style.width = '60%';

    try {
      const res = await fetch('/api/transfer/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          targetDevice: targetDevId,
          senderId: this.deviceId,
          senderName: this.deviceName,
          senderType: this.deviceType
        })
      });

      const data = await res.json();
      if (res.ok) {
        this.uploadToastFill.style.width = '100%';
        this.uploadToastTitle.textContent = `✅ Beamed to ${targetName}!`;
      } else {
        alert(data.error || 'Failed to beam file to receiver');
      }
    } catch (err) {
      console.error(err);
      this.uploadToastTitle.textContent = '❌ Transfer failed';
    }

    setTimeout(() => {
      this.uploadToast.style.display = 'none';
    }, 2800);
  }

  // Handle incoming file delivery on the receiver device
  handleIncomingDelivery(transferData) {
    const { file, senderName, senderType } = transferData;
    this.playNotificationChime();

    // Check if auto-download is enabled on receiver device
    if (this.autoDownloadEnabled) {
      // Trigger actual physical file download straight into the receiver's device!
      this.downloadDirectly(file.downloadUrl, file.name);

      this.uploadToast.style.display = 'flex';
      this.uploadToastTitle.textContent = `📥 Auto-saved "${file.name}" from ${senderName}!`;
      this.uploadToastFill.style.width = '100%';
      setTimeout(() => {
        this.uploadToast.style.display = 'none';
      }, 3500);

      this.addFileToStationList(file, senderName);
    } else {
      // Show confirmation prompt on receiver screen
      this.pendingTransfer = transferData;
      if (this.incomingFileNameText) this.incomingFileNameText.textContent = file.name;
      if (this.incomingSenderText) {
        this.incomingSenderText.textContent = `From ${senderType === 'mobile' ? '📱' : '💻'} ${senderName} · ${file.sizeFormatted}`;
      }
      if (this.incomingTransferModal) this.incomingTransferModal.style.display = 'flex';
    }

    // Also append to receiver's Downloads panel
    this.addDownloadItemToUi(file, senderName);
  }

  downloadDirectly(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  addFileToStationList(file, senderName) {
    if (!this.stationFilesList) return;
    const emptyMsg = this.stationFilesList.querySelector('.empty-station-msg');
    if (emptyMsg) emptyMsg.remove();

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const item = document.createElement('div');
    item.className = 'station-file-item';
    item.innerHTML = `
      <div class="station-file-info">
        <span style="font-size: 20px;">📄</span>
        <div>
          <strong>${file.name}</strong>
          <div style="font-size: 11px; color: var(--text-muted);">${file.sizeFormatted} · From ${senderName} at ${timeStr}</div>
        </div>
      </div>
      <div>
        <button class="table-action-btn" onclick="app.downloadDirectly('${file.downloadUrl}', '${file.name}')">Save Again</button>
      </div>
    `;
    this.stationFilesList.prepend(item);
  }

  addDownloadItemToUi(file, senderName) {
    const newDl = {
      id: `dl-${Date.now()}`,
      fileName: file.name,
      fileSize: file.sizeFormatted,
      status: 'completed',
      statusText: `Saved from ${senderName}`,
      progress: 100,
      dateGroup: 'Today'
    };
    this.downloads.unshift(newDl);
    this.renderDownloads();
  }

  initDragAndDrop() {
    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    ['dragenter', 'dragover'].forEach(eventName => {
      window.addEventListener(eventName, (e) => {
        handleDrag(e);
        this.dropZonePrompt.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      window.addEventListener(eventName, (e) => {
        handleDrag(e);
        this.dropZonePrompt.classList.remove('drag-over');
      });
    });

    window.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.uploadFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  initSSE() {
    try {
      const sseUrl = `/api/events?clientId=${encodeURIComponent(this.deviceId)}&name=${encodeURIComponent(this.deviceName)}&type=${encodeURIComponent(this.deviceType)}`;
      this.sse = new EventSource(sseUrl);

      // Connected handshake
      this.sse.addEventListener('connected', (e) => {
        const data = JSON.parse(e.data);
        if (data.devices) {
          this.updateReceiverDevices(data.devices);
        }
      });

      // When another device connects or disconnects
      this.sse.addEventListener('device_list_updated', (e) => {
        const data = JSON.parse(e.data);
        if (data.devices) {
          this.updateReceiverDevices(data.devices);
        }
      });

      // Targeted incoming file delivery to this receiver device
      this.sse.addEventListener('incoming_file_targeted', (e) => {
        const transferData = JSON.parse(e.data);
        this.handleIncomingDelivery(transferData);
      });

      this.sse.addEventListener('download_updated', (e) => {
        const updatedDl = JSON.parse(e.data);
        const idx = this.downloads.findIndex(d => d.id === updatedDl.id);
        if (idx !== -1) {
          this.downloads[idx] = updatedDl;
        } else {
          this.downloads.unshift(updatedDl);
        }
        this.renderDownloads();
      });

      this.sse.addEventListener('file_uploaded', (e) => {
        const file = JSON.parse(e.data);
        if (!this.files.some(f => f.id === file.id)) {
          this.files.unshift(file);
          this.renderFilesTable();
        }
      });

      this.sse.addEventListener('timeline_added', (e) => {
        const tl = JSON.parse(e.data);
        this.timeline.unshift(tl);
        this.renderTimeline();
      });

      this.sse.addEventListener('file_deleted', (e) => {
        const { id } = JSON.parse(e.data);
        this.files = this.files.filter(f => f.id !== id);
        this.renderFilesTable();
      });
    } catch (err) {
      console.warn('SSE not supported or failed to connect:', err);
    }
  }

  updateReceiverDevices(allDevices) {
    this.connectedDevicesList = allDevices || [];
    if (!this.targetReceiverSelect) return;

    // Filter out our own device
    const otherReceivers = this.connectedDevicesList.filter(d => d.id !== this.deviceId);

    const prevSelection = this.targetReceiverSelect.value;
    let optionsHtml = `<option value="all">⚡ All Receivers (${otherReceivers.length > 0 ? otherReceivers.length + ' Online' : 'Broadcast'})</option>`;

    otherReceivers.forEach(dev => {
      const icon = dev.type === 'mobile' ? '📱' : '💻';
      optionsHtml += `<option value="${dev.id}">${icon} ${dev.name}</option>`;
    });

    this.targetReceiverSelect.innerHTML = optionsHtml;
    if (prevSelection && otherReceivers.some(d => d.id === prevSelection)) {
      this.targetReceiverSelect.value = prevSelection;
    }
  }

  async loadInitialData() {
    try {
      const [filesRes, dlRes, tlRes] = await Promise.all([
        fetch('/api/files'),
        fetch('/api/downloads'),
        fetch('/api/timeline')
      ]);

      const filesData = await filesRes.json();
      this.files = filesData.files || [];

      this.downloads = await dlRes.json();
      this.timeline = await tlRes.json();

      this.renderFilesTable();
      this.renderDownloads();
      this.renderTimeline();
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  }

  async loadSystemStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.shareUrl) {
        this.currentShareUrl = data.shareUrl;
        this.networkShareUrl.value = data.shareUrl;
      }

      // Populate network adapters dropdown
      if (data.networkIps && data.networkIps.length > 0) {
        this.networkIps = data.networkIps;
        if (this.networkIpSelect && data.networkIps.length > 1) {
          this.adapterSelectRow.style.display = 'flex';
          this.networkIpSelect.innerHTML = data.networkIps.map(n => `
            <option value="${n.ip}">${n.name} (${n.ip}) ${n.isWifi ? '★ Wi-Fi' : ''}</option>
          `).join('');
        }
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  }

  setCategory(category) {
    this.currentCategory = category;

    this.categoryItems.forEach(item => {
      const cat = item.getAttribute('data-category');
      if (cat === category) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (category !== 'all') {
      this.activeFilterBadge.style.display = 'inline-flex';
      this.filterCategoryName.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    } else {
      this.activeFilterBadge.style.display = 'none';
    }

    this.renderFilesTable();
  }

  renderFilesTable() {
    let filtered = [...this.files];

    if (this.currentCategory !== 'all') {
      if (this.currentCategory === 'downloads') {
        filtered = filtered.filter(f => f.downloadsCount > 0 || f.name.includes('Glitter') || f.category === 'apps');
      } else {
        filtered = filtered.filter(f => f.category === this.currentCategory);
      }
    }

    if (this.searchQuery) {
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(this.searchQuery) ||
        (f.displayName && f.displayName.toLowerCase().includes(this.searchQuery))
      );
    }

    this.filesCountBadge.textContent = `${filtered.length} files`;

    if (filtered.length === 0) {
      this.filesTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 36px; color: var(--text-muted);">
            No files found matching your criteria.
          </td>
        </tr>
      `;
      return;
    }

    this.filesTableBody.innerHTML = filtered.map(file => {
      const typeClass = `type-${file.category || 'docs'}`;
      const ext = file.name.split('.').pop().toUpperCase();
      const dateFormatted = new Date(file.createdAt || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      return `
        <tr data-file-id="${file.id}">
          <td>
            <div class="file-name-cell">
              <div class="file-type-icon ${typeClass}">${ext.slice(0, 4)}</div>
              <div>
                <div>${file.displayName || file.name}</div>
                <small style="color: var(--text-muted); font-size: 11px;">${file.name}</small>
              </div>
            </div>
          </td>
          <td style="text-transform: capitalize;">${file.category}</td>
          <td>${file.sizeFormatted || '—'}</td>
          <td>${dateFormatted}</td>
          <td class="text-right">
            ${file.category === 'video' || file.category === 'music' || file.category === 'image' ?
              `<button class="table-action-btn btn-preview" onclick="app.previewFile('${file.id}')">Preview</button>` : ''}
            <button class="table-action-btn btn-beam-receiver" onclick="app.beamFileToReceiver('${file.id}')" title="Beam directly to Receiver device">⚡ Beam to Receiver</button>
            <button class="table-action-btn btn-phone-transfer" onclick="app.showFileQr('${file.name}')" title="Send to Phone via QR">📲 QR</button>
            <button class="table-action-btn" onclick="app.downloadFile('${file.name}', '${file.id}')">Download</button>
            <button class="table-action-btn table-delete-btn" onclick="app.deleteFile('${file.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderDownloads() {
    const todayItems = this.downloads.filter(d => d.dateGroup === 'Today' || !d.dateGroup);
    const yesterdayItems = this.downloads.filter(d => d.dateGroup === 'Yesterday');

    this.todayDownloadsList.innerHTML = todayItems.map(item => this.createDownloadItemHtml(item, 'blue')).join('');
    this.yesterdayDownloadsList.innerHTML = yesterdayItems.map(item => this.createDownloadItemHtml(item, 'cyan')).join('');
  }

  createDownloadItemHtml(item, boxColor) {
    const isPaused = item.status === 'paused';
    const isActive = item.status === 'active';
    const isCompleted = item.status === 'completed';

    let actionBtnHtml = '';
    if (item.status === 'waiting') {
      actionBtnHtml = `
        <button class="dl-action-btn btn-start-dl" onclick="app.triggerDownloadAction('${item.id}', 'start')" title="Start Download">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="4" x2="12" y2="15"></line>
          </svg>
        </button>
      `;
    } else if (isActive) {
      actionBtnHtml = `
        <button class="dl-action-btn btn-pause-dl" onclick="app.triggerDownloadAction('${item.id}', 'pause')" title="Pause Download">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
        </button>
      `;
    } else if (isPaused) {
      actionBtnHtml = `
        <button class="dl-action-btn btn-pause-dl" onclick="app.triggerDownloadAction('${item.id}', 'resume')" title="Resume Download">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4"></polygon>
          </svg>
        </button>
      `;
    } else {
      actionBtnHtml = `
        <button class="dl-action-btn btn-start-dl" title="Download Complete">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      `;
    }

    return `
      <div class="download-card" id="dl-card-${item.id}">
        <div class="download-icon-box box-${boxColor}">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div class="download-info">
          <div class="dl-title" title="${item.fileName}">${item.fileName}</div>
          <div class="dl-subtext">
            ${item.fileSize} · ${item.statusText || 'Ready'}
          </div>
          ${(isActive || isPaused) ? `
            <div class="dl-progress-track">
              <div class="dl-progress-bar" style="width: ${item.progress || 0}%;"></div>
            </div>
          ` : ''}
        </div>
        ${actionBtnHtml}
      </div>
    `;
  }

  renderTimeline() {
    if (!this.timeline || this.timeline.length === 0) {
      this.timelineList.innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">No recent transfers</p>`;
      return;
    }

    this.timelineList.innerHTML = this.timeline.map((entry, index) => {
      const thumbsHtml = (entry.thumbnails || []).map(thumb => `
        <img src="${thumb}" alt="thumb" class="timeline-thumb-img" onclick="app.previewImage('${thumb}')" onerror="this.src='/assets/sample-media/timeline-1.jpg'">
      `).join('');

      return `
        <div class="timeline-entry">
          <div class="timeline-marker-top"></div>
          <span class="timeline-time-label-top">${entry.startTime || '15:30'}</span>
          <div class="timeline-thumbs-row">
            ${thumbsHtml}
          </div>
          <div class="timeline-summary">
            Received <span class="highlight-accent">${entry.count || 3} Files</span> total <span class="highlight-accent">${entry.totalSize || '50.3 MB'}</span>
          </div>
          <div class="timeline-marker-bottom"></div>
          <span class="timeline-time-label-bottom">${entry.endTime || '19:30'}</span>
        </div>
      `;
    }).join('');
  }

  async triggerDownloadAction(downloadId, action) {
    try {
      const res = await fetch('/api/downloads/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadId, action })
      });
      const data = await res.json();
      if (data.success) {
        const item = this.downloads.find(d => d.id === downloadId);
        if (item) {
          item.status = data.status;
          this.renderDownloads();
        }
      }
    } catch (err) {
      console.error('Error triggering download action:', err);
    }
  }

  async downloadFile(fileName, fileId) {
    try {
      await fetch('/api/downloads/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', fileId })
      });
    } catch (e) {
      console.warn(e);
    }

    this.downloadDirectly(`/api/download/${encodeURIComponent(fileName)}`, fileName);
  }

  async deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        this.files = this.files.filter(f => f.id !== fileId);
        this.renderFilesTable();
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }

  previewFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;

    if (file.category === 'video') {
      this.openMediaModal(file.displayName || file.name, file.fileUrl || '/uploads/glitter.mp4', 'video');
    } else if (file.category === 'music') {
      this.openMediaModal(file.displayName || file.name, file.fileUrl || '/uploads/ambient_soundtrack.wav', 'audio');
    } else if (file.category === 'image') {
      this.openMediaModal(file.displayName || file.name, file.thumbnailUrl || file.fileUrl, 'image');
    }
  }

  previewImage(imgUrl) {
    this.openMediaModal('Image Viewer', imgUrl, 'image');
  }

  openMediaModal(title, sourceUrl, type) {
    this.modalMediaTitle.textContent = title;
    this.modalMediaBody.innerHTML = '';

    if (type === 'video') {
      const video = document.createElement('video');
      video.src = sourceUrl;
      video.controls = true;
      video.autoplay = true;
      this.modalMediaBody.appendChild(video);
    } else if (type === 'audio') {
      const audio = document.createElement('audio');
      audio.src = sourceUrl;
      audio.controls = true;
      audio.autoplay = true;
      this.modalMediaBody.appendChild(audio);
    } else if (type === 'image') {
      const img = document.createElement('img');
      img.src = sourceUrl;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '450px';
      img.style.borderRadius = '12px';
      img.style.display = 'block';
      img.style.margin = '0 auto';
      this.modalMediaBody.appendChild(img);
    }

    this.mediaModal.style.display = 'flex';
  }

  closeMediaModal() {
    this.mediaModal.style.display = 'none';
    this.modalMediaBody.innerHTML = '';
  }

  async uploadFiles(filesList) {
    if (!filesList || filesList.length === 0) return;

    const targetDevId = this.targetReceiverId;
    const targetName = this.targetReceiverSelect ? this.targetReceiverSelect.options[this.targetReceiverSelect.selectedIndex].text : 'Receiver';

    this.uploadToast.style.display = 'flex';
    this.uploadToastTitle.textContent = `Transmitting ${filesList.length} file${filesList.length > 1 ? 's' : ''} to ${targetName}...`;
    this.uploadToastFill.style.width = '30%';

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      try {
        const formData = new FormData();
        formData.append('files', file);

        this.uploadToastFill.style.width = `${Math.floor(((i + 0.5) / filesList.length) * 100)}%`;

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'X-Sender-Id': this.deviceId,
            'X-Sender-Name': encodeURIComponent(this.deviceName),
            'X-Sender-Type': this.deviceType,
            'X-Target-Device': targetDevId
          },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.files) {
            data.files.forEach(f => {
              if (!this.files.some(existing => existing.id === f.id)) {
                this.files.unshift(f);
              }
            });
          }
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }

    this.uploadToastFill.style.width = '100%';
    this.uploadToastTitle.textContent = `✅ Transmitted to ${targetName}!`;
    this.renderFilesTable();

    setTimeout(() => {
      this.uploadToast.style.display = 'none';
    }, 2500);
  }
}

// Instantiate application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MyDocsApp();
});
