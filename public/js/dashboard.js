document.addEventListener('DOMContentLoaded', () => {
  // Check Authentication
  const token = localStorage.getItem('torrent_token');
  const userJson = localStorage.getItem('torrent_user');

  if (!token) {
    window.location.href = '/';
    return;
  }

  // Display User Name
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      document.getElementById('userNameDisplay').textContent = user.name || 'User';
    } catch (e) {
      console.warn('Failed to parse user session');
    }
  }

  // Logout handler
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('torrent_token');
    localStorage.removeItem('torrent_user');
    window.location.href = '/';
  });

  // Toast Notification System
  const toastCard = document.getElementById('toastCard');
  const toastNotification = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');
  let toastTimer = null;

  const showToast = (message, type = 'success') => {
    if (toastTimer) clearTimeout(toastTimer);
    toastMsg.textContent = message;
    
    if (type === 'error') {
      toastCard.className = 'flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium bg-red-50 text-red-800 border-red-200';
      toastIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
      toastCard.className = 'flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium bg-emerald-50 text-emerald-800 border-emerald-200';
      toastIcon.setAttribute('data-lucide', 'check-circle-2');
    }

    if (window.lucide) lucide.createIcons();

    toastNotification.classList.remove('opacity-0', 'translate-y-[-20px]', 'pointer-events-none');
    toastNotification.classList.add('opacity-100', 'translate-y-0');

    toastTimer = setTimeout(() => {
      toastNotification.classList.remove('opacity-100', 'translate-y-0');
      toastNotification.classList.add('opacity-0', 'translate-y-[-20px]', 'pointer-events-none');
    }, 3200);
  };

  // ==========================================
  // TAB NAVIGATION
  // ==========================================
  const tabs = [
    { btn: document.getElementById('tabBtn-env'), pane: document.getElementById('tabContent-env') },
    { btn: document.getElementById('tabBtn-lcd'), pane: document.getElementById('tabContent-lcd') },
    { btn: document.getElementById('tabBtn-led'), pane: document.getElementById('tabContent-led') },
  ];

  tabs.forEach(tab => {
    tab.btn.addEventListener('click', () => {
      tabs.forEach(t => {
        t.btn.classList.remove('active', 'bg-white', 'text-brand-700', 'shadow-sm', 'border', 'border-brand-200');
        t.btn.classList.add('text-slate-600');
        t.pane.classList.add('hidden');
      });

      tab.btn.classList.add('active', 'bg-white', 'text-brand-700', 'shadow-sm', 'border', 'border-brand-200');
      tab.btn.classList.remove('text-slate-600');
      tab.pane.classList.remove('hidden');

      if (window.lucide) lucide.createIcons();
    });
  });

  // ==========================================
  // TAB 1: ENVIRONMENT MONITORING & SENSORS
  // ==========================================
  let currentPage = 1;
  const recordsPerPage = 20;
  let chartInstance = null;
  const GAUGE_CIRCUMFERENCE = 314.15; // 2 * PI * 50

  // Initialize Chart.js
  const initTelemetryChart = () => {
    const ctx = document.getElementById('telemetryChart').getContext('2d');
    
    // Light Blue Theme Gradients
    const tempGrad = ctx.createLinearGradient(0, 0, 0, 250);
    tempGrad.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
    tempGrad.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

    const humGrad = ctx.createLinearGradient(0, 0, 0, 250);
    humGrad.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
    humGrad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Temperature (°C)',
            data: [],
            borderColor: '#f97316',
            backgroundColor: tempGrad,
            borderWidth: 2.5,
            pointBackgroundColor: '#ea580c',
            pointRadius: 3,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Humidity (% RH)',
            data: [],
            borderColor: '#0284c7',
            backgroundColor: humGrad,
            borderWidth: 2.5,
            pointBackgroundColor: '#0369a1',
            pointRadius: 3,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              font: { family: 'Outfit', size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { family: 'Outfit', size: 13 },
            bodyFont: { family: 'Outfit', size: 12 },
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'JetBrains Mono', size: 10 },
              maxTicksLimit: 8
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 0,
            max: 50,
            title: {
              display: true,
              text: 'Temperature (°C)',
              font: { family: 'Outfit', size: 11, weight: 'bold' }
            },
            grid: { color: 'rgba(226, 232, 240, 0.6)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Humidity (%)',
              font: { family: 'Outfit', size: 11, weight: 'bold' }
            },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  };

  // Update Visual Circular Gauges & Seek Bars
  const updateGauges = (temp, hum) => {
    // 1. Temperature (0°C to 50°C scale)
    const validTemp = (temp !== null && temp !== undefined) ? Number(temp) : null;
    const tempValEl = document.getElementById('tempGaugeValue');
    const tempProgress = document.getElementById('tempGaugeProgress');
    const tempSeekBarFill = document.getElementById('tempSeekBarFill');
    const tempPercentEl = document.getElementById('tempPercent');
    const tempStatusBadge = document.getElementById('tempStatusBadge');
    const tempComfortText = document.getElementById('tempComfortText');

    if (validTemp !== null && !isNaN(validTemp)) {
      tempValEl.textContent = validTemp.toFixed(1);
      const tempFraction = Math.min(Math.max(validTemp / 50, 0), 1);
      const tempOffset = GAUGE_CIRCUMFERENCE * (1 - tempFraction);
      tempProgress.style.strokeDashoffset = tempOffset;
      
      const tempPct = Math.round(tempFraction * 100);
      tempSeekBarFill.style.width = `${tempPct}%`;
      tempPercentEl.textContent = `${tempPct}% of max`;

      // Status indicator
      if (validTemp < 18) {
        tempStatusBadge.textContent = 'Cool / Cold';
        tempStatusBadge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200';
        tempComfortText.textContent = 'Cool Environment';
      } else if (validTemp <= 30) {
        tempStatusBadge.textContent = 'Optimal Comfort';
        tempStatusBadge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200';
        tempComfortText.textContent = 'Optimal Comfort Range';
      } else {
        tempStatusBadge.textContent = 'Elevated / Warm';
        tempStatusBadge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200';
        tempComfortText.textContent = 'Warm Environment';
      }
    } else {
      tempValEl.textContent = '--';
      tempProgress.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
      tempSeekBarFill.style.width = '0%';
      tempPercentEl.textContent = '--%';
      tempStatusBadge.textContent = 'Waiting';
      tempComfortText.textContent = 'No signal received';
    }

    // 2. Humidity (0% to 100% scale)
    const validHum = (hum !== null && hum !== undefined) ? Number(hum) : null;
    const humValEl = document.getElementById('humGaugeValue');
    const humProgress = document.getElementById('humGaugeProgress');
    const humSeekBarFill = document.getElementById('humSeekBarFill');
    const humPercentEl = document.getElementById('humPercent');
    const humStatusBadge = document.getElementById('humStatusBadge');
    const humAirText = document.getElementById('humAirText');

    if (validHum !== null && !isNaN(validHum)) {
      humValEl.textContent = validHum.toFixed(1);
      const humFraction = Math.min(Math.max(validHum / 100, 0), 1);
      const humOffset = GAUGE_CIRCUMFERENCE * (1 - humFraction);
      humProgress.style.strokeDashoffset = humOffset;

      const humPct = Math.round(humFraction * 100);
      humSeekBarFill.style.width = `${humPct}%`;
      humPercentEl.textContent = `${humPct}% RH`;

      if (validHum < 30) {
        humStatusBadge.textContent = 'Dry Air';
        humStatusBadge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200';
        humAirText.textContent = 'Low Moisture';
      } else if (validHum <= 65) {
        humStatusBadge.textContent = 'Ideal Range';
        humStatusBadge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-brand-800 border border-brand-200';
        humAirText.textContent = 'Normal / Comfortable Moisture';
      } else {
        humStatusBadge.textContent = 'High Moisture';
        humStatusBadge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200';
        humAirText.textContent = 'Humid Air Condition';
      }
    } else {
      humValEl.textContent = '--';
      humProgress.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
      humSeekBarFill.style.width = '0%';
      humPercentEl.textContent = '--%';
      humStatusBadge.textContent = 'Waiting';
      humAirText.textContent = 'No signal received';
    }
  };

  // Fetch Chart Data
  const fetchChartData = async () => {
    try {
      const res = await fetch('/api/dht/chart?limit=25', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;

      const data = await res.json();
      if (chartInstance && data.points) {
        chartInstance.data.labels = data.points.map(p => p.time);
        chartInstance.data.datasets[0].data = data.points.map(p => p.temperature);
        chartInstance.data.datasets[1].data = data.points.map(p => p.humidity);
        chartInstance.update();
      }
    } catch (e) {
      console.warn('Failed to fetch chart telemetry:', e);
    }
  };

  // Fetch Paginated Records Table
  const fetchHistoryTable = async (page = 1) => {
    const tbody = document.getElementById('recordsTableBody');
    try {
      const res = await fetch(`/api/dht/history?page=${page}&limit=${recordsPerPage}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch records');
      const data = await res.json();

      currentPage = data.pagination.currentPage;
      const totalRecords = data.pagination.totalRecords;
      const totalPages = data.pagination.totalPages;

      // Update Pagination Indicators
      document.getElementById('totalRecordsBadge').textContent = `Total Records: ${totalRecords}`;
      document.getElementById('currentPageNum').textContent = currentPage;
      document.getElementById('totalPagesNum').textContent = totalPages;
      document.getElementById('pageTotalText').textContent = totalRecords;

      const startCount = totalRecords === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
      const endCount = Math.min(currentPage * recordsPerPage, totalRecords);
      document.getElementById('pageRangeText').textContent = `${startCount} - ${endCount}`;

      document.getElementById('prevPageBtn').disabled = currentPage <= 1;
      document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;

      if (!data.records || data.records.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="py-8 text-center text-slate-400">
              <div class="flex flex-col items-center justify-center space-y-1">
                <i data-lucide="inbox" class="w-8 h-8 text-slate-300"></i>
                <p class="font-medium text-slate-500">No sensor records found yet.</p>
                <p class="text-xs text-slate-400">Readings from ESP8266 DHT11 will automatically appear here every 10s.</p>
              </div>
            </td>
          </tr>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      // Populate Rows
      tbody.innerHTML = data.records.map((rec) => `
        <tr class="hover:bg-brand-50/50 transition-colors">
          <td class="py-3 px-4 font-mono text-xs font-semibold text-brand-700">#${rec.id}</td>
          <td class="py-3 px-4 font-semibold text-slate-800">
            <span class="inline-flex items-center space-x-1">
              <span>${Number(rec.temperature).toFixed(1)}</span>
              <span class="text-xs text-orange-600 font-normal">°C</span>
            </span>
          </td>
          <td class="py-3 px-4 font-semibold text-slate-800">
            <span class="inline-flex items-center space-x-1">
              <span>${Number(rec.humidity).toFixed(1)}</span>
              <span class="text-xs text-brand-600 font-normal">% RH</span>
            </span>
          </td>
          <td class="py-3 px-4 font-mono text-xs text-slate-600">
            ${rec.time}
          </td>
          <td class="py-3 px-4 text-xs text-slate-600">
            ${rec.date}
          </td>
          <td class="py-3 px-4 text-center">
            <button 
              class="delete-record-btn text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-200 transition-colors"
              data-id="${rec.id}"
              title="Delete Record #${rec.id}"
            >
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `).join('');

      if (window.lucide) lucide.createIcons();

      // Attach Delete Handlers
      document.querySelectorAll('.delete-record-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const recordId = btn.getAttribute('data-id');
          if (confirm(`Are you sure you want to delete record #${recordId}?`)) {
            await deleteRecord(recordId);
          }
        });
      });

    } catch (err) {
      console.error('Error fetching history:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-4 text-center text-xs text-red-500 font-medium">
            Failed to load records. Retrying automatically...
          </td>
        </tr>
      `;
    }
  };

  // Delete Individual Record
  const deleteRecord = async (recordId) => {
    try {
      const res = await fetch(`/api/dht/${recordId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');

      showToast(`Record #${recordId} deleted successfully.`, 'success');
      await fetchHistoryTable(currentPage);
      await fetchChartData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Pagination buttons
  document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (currentPage > 1) fetchHistoryTable(currentPage - 1);
  });
  document.getElementById('nextPageBtn').addEventListener('click', () => {
    fetchHistoryTable(currentPage + 1);
  });
  document.getElementById('refreshTableBtn').addEventListener('click', () => {
    fetchHistoryTable(currentPage);
    showToast('Table refreshed', 'success');
  });

  // Manual Refresh
  document.getElementById('manualRefreshBtn').addEventListener('click', async () => {
    await pollDeviceState();
    await fetchHistoryTable(currentPage);
    await fetchChartData();
    showToast('Data refreshed', 'success');
  });

  // ==========================================
  // TAB 2: SMART LCD 16x2 CONTROLLER
  // ==========================================
  const lcdRow1Input = document.getElementById('lcdRow1Input');
  const lcdRow2Input = document.getElementById('lcdRow2Input');
  const simulatedLcdRow1 = document.getElementById('simulatedLcdRow1');
  const simulatedLcdRow2 = document.getElementById('simulatedLcdRow2');
  const row1Count = document.getElementById('row1Count');
  const row2Count = document.getElementById('row2Count');
  const lcdUpdateForm = document.getElementById('lcdUpdateForm');

  // Format string for 16-character LCD row
  const formatLcdDisplayString = (str) => {
    const raw = String(str || '').slice(0, 16);
    return raw.padEnd(16, ' ');
  };

  // Real-time typing sync with visualizer
  const updateLcdPreview = () => {
    const r1 = lcdRow1Input.value.slice(0, 16);
    const r2 = lcdRow2Input.value.slice(0, 16);
    simulatedLcdRow1.textContent = formatLcdDisplayString(r1);
    simulatedLcdRow2.textContent = formatLcdDisplayString(r2);
    row1Count.textContent = `${r1.length} / 16 chars`;
    row2Count.textContent = `${r2.length} / 16 chars`;
  };

  lcdRow1Input.addEventListener('input', updateLcdPreview);
  lcdRow2Input.addEventListener('input', updateLcdPreview);

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lcdRow1Input.value = btn.getAttribute('data-r1');
      lcdRow2Input.value = btn.getAttribute('data-r2');
      updateLcdPreview();
    });
  });

  // LCD Update Form Submit
  lcdUpdateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updateBtn = document.getElementById('lcdUpdateBtn');
    const r1 = lcdRow1Input.value.slice(0, 16);
    const r2 = lcdRow2Input.value.slice(0, 16);

    updateBtn.disabled = true;
    updateBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>Sending to ESP8266 LCD...</span>
    `;

    try {
      const res = await fetch('/api/device/lcd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ line1: r1, line2: r2 })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update LCD display');

      showToast('LCD display updated successfully! ESP8266 syncing.', 'success');
      updateLcdPreview();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      updateBtn.disabled = false;
      updateBtn.innerHTML = `<i data-lucide="send" class="w-4 h-4 mr-1"></i><span>Update LCD Display</span>`;
      if (window.lucide) lucide.createIcons();
    }
  });

  // ==========================================
  // TAB 3: LED AUTOMATION
  // ==========================================
  const ledToggleBtn = document.getElementById('ledToggleBtn');
  const ledToggleSlider = document.getElementById('ledToggleSlider');
  const ledBulbVisual = document.getElementById('ledBulbVisual');
  const ledStatusBadge = document.getElementById('ledStatusBadge');
  let currentLedState = 0;

  const updateLedUI = (state) => {
    currentLedState = (state === 1 || state === true) ? 1 : 0;
    if (currentLedState === 1) {
      ledToggleBtn.classList.remove('bg-slate-300');
      ledToggleBtn.classList.add('bg-brand-500');
      ledToggleSlider.classList.remove('translate-x-0');
      ledToggleSlider.classList.add('translate-x-10');
      ledToggleBtn.setAttribute('aria-checked', 'true');

      ledBulbVisual.classList.remove('off');
      ledBulbVisual.classList.add('on');

      ledStatusBadge.textContent = 'LED is currently ACTIVE (D0: HIGH)';
      ledStatusBadge.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-brand-100 text-brand-800 border border-brand-200';
    } else {
      ledToggleBtn.classList.remove('bg-brand-500');
      ledToggleBtn.classList.add('bg-slate-300');
      ledToggleSlider.classList.remove('translate-x-10');
      ledToggleSlider.classList.add('translate-x-0');
      ledToggleBtn.setAttribute('aria-checked', 'false');

      ledBulbVisual.classList.remove('on');
      ledBulbVisual.classList.add('off');

      ledStatusBadge.textContent = 'LED is currently OFF (D0: LOW)';
      ledStatusBadge.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  ledToggleBtn.addEventListener('click', async () => {
    const targetState = currentLedState === 1 ? 0 : 1;
    // Optimistic UI
    updateLedUI(targetState);

    try {
      const res = await fetch('/api/device/led', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ state: targetState })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update LED state');

      showToast(`LED switched ${targetState === 1 ? 'ON' : 'OFF'}! Hardware syncing.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
      // Revert UI on failure
      updateLedUI(currentLedState === 1 ? 0 : 1);
    }
  });

  // ==========================================
  // HARDWARE POLLING (EVERY 10 SECONDS)
  // ==========================================
  const pollDeviceState = async () => {
    try {
      const res = await fetch('/api/device/state');
      if (!res.ok) return;

      const data = await res.json();

      // 1. ESP8266 Online Status
      const espDot = document.getElementById('espStatusDot');
      const espText = document.getElementById('espStatusText');

      if (data.online) {
        espDot.innerHTML = `
          <span class="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        `;
        espText.textContent = 'ESP8266 Online';
        espText.className = 'text-xs font-semibold text-emerald-700';
      } else {
        espDot.innerHTML = `
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
        `;
        espText.textContent = 'ESP8266 Standby';
        espText.className = 'text-xs font-semibold text-slate-500';
      }

      // 2. Telemetry (DHT11)
      if (data.latest_dht) {
        updateGauges(data.latest_dht.temperature, data.latest_dht.humidity);
        document.getElementById('lastSyncedTime').textContent = `${data.latest_dht.time} (${data.latest_dht.date})`;
      }

      // 3. LCD State from server (if input not actively focused)
      if (document.activeElement !== lcdRow1Input && document.activeElement !== lcdRow2Input) {
        if (data.lcd_line1 !== undefined && data.lcd_line2 !== undefined) {
          lcdRow1Input.value = data.lcd_line1;
          lcdRow2Input.value = data.lcd_line2;
          updateLcdPreview();
        }
      }

      // 4. LED State
      if (data.led_state !== undefined && data.led_state !== currentLedState) {
        updateLedUI(data.led_state);
      }

    } catch (e) {
      console.warn('Polling error:', e);
    }
  };

  // Initial Boot
  initTelemetryChart();
  updateLcdPreview();
  pollDeviceState();
  fetchHistoryTable(1);
  fetchChartData();

  // Background 10-second polling loop matching DHT11 sensor interval
  setInterval(async () => {
    await pollDeviceState();
    await fetchChartData();
    // Only refresh page 1 automatically if user is on page 1
    if (currentPage === 1) {
      await fetchHistoryTable(1);
    }
  }, 10000);

});
