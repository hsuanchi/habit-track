
        const firebaseConfig = {
            apiKey: "AIzaSyA8TJUSbLBabNuW5RqAwWWOtxL-pZ4iOSc",
            authDomain: "habit-track-4e1c9.firebaseapp.com",
            projectId: "habit-track-4e1c9",
            storageBucket: "habit-track-4e1c9.firebasestorage.app",
            messagingSenderId: "361569656644",
            appId: "1:361569656644:web:53318c27d47b0df5b50111",
            measurementId: "G-7Q04BPF2TN"
        };
        const LOCAL_STORAGE_KEY = 'level_up_life_db';
        const INITIAL_STATS = { level: 1, currentXp: 0, nextLevelXp: 100, attributes: { BODY: 1, MIND: 1, SOUL: 1 } };
        const STAT_ICONS = { 
            BODY: '<i data-lucide="activity" class="w-4 h-4"></i>', 
            MIND: '<i data-lucide="brain" class="w-4 h-4"></i>', 
            SOUL: '<i data-lucide="heart" class="w-4 h-4"></i>' 
        };

        let app, auth, db;
        let isOfflineMode = false;
        let state = {
            user: null,
            habits: [],
            gratitudeLogs: [],
            tasks: [],
            sources: [], // Persisted order of tags
            stats: { ...INITIAL_STATS },
            lastModified: Date.now(),
            ui: {
                selectedDate: new Date(),
                viewDate: new Date(),
                modalType: 'good', 
                selectedStat: 'BODY',
                currentTab: 'tasks',
                expandedTaskId: null,
                showWaitingTasks: false,
                showCompletedTasks: false,
                taskFilterSource: '',
                showTaskFilter: false
            }
        };

        window.toggleTaskFilter = () => {
            state.ui.showTaskFilter = !state.ui.showTaskFilter;
            const panel = document.getElementById('task-filter-panel');
            if (panel) {
                if (state.ui.showTaskFilter) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            }
            renderTaskFilterChips();
        };

        window.setTaskFilter = (src) => {
            state.ui.taskFilterSource = src;
            renderTasks();
            renderTaskFilterChips();
        };

        window.renderTaskFilterChips = () => {
            const container = document.getElementById('task-filter-chips');
            if (!container) return;
            let html = `<button onclick="window.setTaskFilter('')" class="px-3 py-1 text-[11px] font-bold rounded ${state.ui.taskFilterSource === '' ? 'bg-[#ff6b35] text-white' : 'bg-slate-800 text-white hover:bg-slate-700'} transition">All</button>`;
            
            // Collect unique sources from non-meeting tasks
            const activeSources = [...new Set(state.tasks.filter(t => t.type !== 'meeting' && t.source).map(t => t.source))];
            
            activeSources.forEach(s => {
                const isActive = state.ui.taskFilterSource === s;
                html += `<button onclick="window.setTaskFilter('${s}')" class="px-3 py-1 text-[11px] font-bold rounded ${isActive ? 'bg-[#ff6b35] text-white' : 'bg-slate-800 text-white hover:bg-slate-700'} transition">${s}</button>`;
            });
            container.innerHTML = html;
        };
        let radarChartInstance = null;
        let calendarInstance = null;

        window.switchTab = (tab) => {
            state.ui.currentTab = tab;
            const viewHabits = document.getElementById('view-habits');
            const viewTasks = document.getElementById('view-tasks');
            const viewReview = document.getElementById('view-review');
            
            viewHabits.style.display = tab === 'habits' ? 'grid' : 'none';
            viewTasks.style.display = tab === 'tasks' ? 'grid' : 'none';
            viewReview.style.display = tab === 'review' ? 'flex' : 'none';
            
            const navHabits = document.getElementById('nav-habits');
            const navTasks = document.getElementById('nav-tasks');
            const navReview = document.getElementById('nav-review');
            
            const activeClass = "px-5 py-2 rounded-xl text-[13px] font-bold border border-[#ff6b35]/50 text-[#ff6b35] transition-all";
            const inactiveClass = "px-5 py-2 rounded-xl text-[13px] font-bold border border-transparent text-slate-400 hover:text-white transition-all";

            navHabits.className = tab === 'habits' ? activeClass : inactiveClass;
            navTasks.className = tab === 'tasks' ? activeClass : inactiveClass;
            navReview.className = tab === 'review' ? activeClass : inactiveClass;

            if (tab === 'tasks' && calendarInstance) {
                setTimeout(() => calendarInstance.render(), 100);
            }
            if (tab === 'review') {
                renderReview();
            }
        };

        window.selectDate = (dateStr) => { state.ui.selectedDate = new Date(dateStr); renderAll(); };
        window.toggleHabit = (id) => {
            if(!window.dateFns) return;
            const habit = state.habits.find(h => h.id === id);
            if (!habit) return;
            const dateStr = dateFns.format(state.ui.selectedDate, 'yyyy-MM-dd');
            const isCompleted = habit.completedDates.includes(dateStr);
            const mult = habit.type === 'good' ? 1 : -1;
            if (isCompleted) {
                habit.completedDates = habit.completedDates.filter(d => d !== dateStr);
                updateStats(-10 * mult, habit.stat, -1 * mult);
            } else {
                habit.completedDates.push(dateStr);
                updateStats(10 * mult, habit.stat, 1 * mult);
            }
            renderAll();
            saveData();
        };
        window.deleteHabit = (id) => {
            if (confirm("Delete this quest?")) {
                state.habits = state.habits.filter(h => h.id !== id);
                renderAll();
                saveData();
            }
        };
        window.deleteGratitude = (id) => {
            if(confirm("Remove entry?")) {
                state.gratitudeLogs = state.gratitudeLogs.filter(g => g.id !== id);
                updateStats(-5, 'SOUL', -1);
                renderAll();
                saveData();
            }
        };

        window.addTask = (title, source = '', difficulty = 'medium', date = null, type = 'task', startTime = '', endTime = '', notes = '', endDate = null, allDay = false, recurrence = 'none', recurrenceUntil = '') => {
            if (!title.trim()) return;
            const minOrder = state.tasks.length > 0 ? Math.min(...state.tasks.map(t => t.order || 0)) : 0;
            const newTask = {
                id: crypto.randomUUID(),
                title: title.trim(),
                notes: notes.trim(),
                source: source.trim(),
                difficulty: difficulty,
                date: (date && date !== '') ? date : (state.ui.newTaskDate || '2030-05-13'),
                endDate: endDate,
                allDay: allDay,
                type: type,
                startTime: startTime,
                endTime: endTime,
                recurrence: recurrence,
                recurrenceUntil: recurrenceUntil,
                completed: false,
                createdAt: new Date().toISOString(),
                order: minOrder - 1 // Place new tasks at the top
            };
            state.tasks.push(newTask);
            
            // Add to sources if not exists
            if (newTask.source && !state.sources.includes(newTask.source)) {
                state.sources.push(newTask.source);
            }

            state.ui.newTaskDate = null; // Reset after adding
            renderTasks();
            updateCalendarEvents();
            saveData();
        };

        window.toggleTask = (id) => {
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                
                if (task.completed) {
                    // Add XP based on difficulty
                    let xpReward = 10; // default easy
                    if (task.difficulty === 'quick') xpReward = 5;
                    else if (task.difficulty === 'medium') xpReward = 20;
                    else if (task.difficulty === 'hard') xpReward = 30;
                    
                    updateStats(xpReward, 'MIND', 0);
                } else {
                    // Remove XP if uncompleted
                    let xpReward = 10;
                    if (task.difficulty === 'quick') xpReward = 5;
                    else if (task.difficulty === 'medium') xpReward = 20;
                    else if (task.difficulty === 'hard') xpReward = 30;
                    
                    updateStats(-xpReward, 'MIND', 0);
                }

                renderTasks();
                updateCalendarEvents();
                if (window.renderTaskFilterChips) window.renderTaskFilterChips();
                if (window.renderSourceChips) window.renderSourceChips();
                else if (typeof renderSourceChips === 'function') renderSourceChips();
                saveData();
            }
        };

        window.toggleBookmark = (id) => {
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.isBookmarked = !task.isBookmarked;
                renderTasks();
                updateCalendarEvents();
                saveData();
            }
        };

        window.deleteTask = (id) => {
            if (confirm("Delete this task?")) {
                state.tasks = state.tasks.filter(t => t.id !== id);
                if (state.ui.expandedTaskId === id) state.ui.expandedTaskId = null;
                renderTasks();
                updateCalendarEvents();
                if (window.renderTaskFilterChips) window.renderTaskFilterChips();
                if (typeof renderSourceChips === 'function') renderSourceChips();
                saveData();
            }
        };

        window.expandTask = (id) => {
            state.ui.expandedTaskId = state.ui.expandedTaskId === id ? null : id;
            renderTasks();
        };

        window.updateTask = (id, field, value) => {
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                if (typeof field === 'object') {
                    Object.assign(task, field);
                } else {
                    task[field] = value;
                }
                renderTasks();
                updateCalendarEvents();
                saveData();
            }
        };

        window.toggleWaitingTasks = () => {
            state.ui.showWaitingTasks = !state.ui.showWaitingTasks;
            const list = document.getElementById('waiting-tasks-list');
            const icon = document.getElementById('waiting-tasks-icon');
            if (state.ui.showWaitingTasks) {
                list.classList.remove('hidden');
                icon.classList.add('rotate-180');
            } else {
                list.classList.add('hidden');
                icon.classList.remove('rotate-180');
            }
        };

        window.toggleCompletedTasks = () => {
            state.ui.showCompletedTasks = !state.ui.showCompletedTasks;
            const list = document.getElementById('completed-tasks-list');
            const icon = document.getElementById('completed-tasks-icon');
            if (state.ui.showCompletedTasks) {
                list.classList.remove('hidden');
                icon.classList.add('rotate-180');
            } else {
                list.classList.add('hidden');
                icon.classList.remove('rotate-180');
            }
        };
        window.toggleGratitudeHistory = () => document.getElementById('gratitude-history').classList.toggle('hidden');
        window.openModal = (type) => {
            state.ui.modalType = type;
            const modal = document.getElementById('habit-modal');
            const titleEl = document.getElementById('modal-title');
            const colorClass = type === 'good' ? 'text-[#ff6b35]' : 'text-rose-500';
            titleEl.innerHTML = `<span class="${colorClass}">Add ${type === 'good' ? 'Positive' : 'Negative'} Habit</span>`;
            document.getElementById('modal-habit-title').value = '';
            document.getElementById('modal-habit-title').focus();
            document.getElementById('modal-stat-selector').innerHTML = Object.entries({BODY: 'Body', MIND: 'Mind', SOUL: 'Soul'}).map(([key, label]) => `
                <button onclick="window.selectStat('${key}')" data-key="${key}" class="stat-btn p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${state.ui.selectedStat === key ? 'bg-slate-950 border-white text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-500'}">
                    ${STAT_ICONS[key]} <span class="text-[10px] font-bold uppercase">${label}</span>
                </button>`).join('');
            modal.classList.remove('hidden');
            safeCreateIcons();
        };
        window.selectStat = (key) => {
            state.ui.selectedStat = key;
            const btns = document.querySelectorAll('.stat-btn');
            btns.forEach(btn => {
                if(btn.dataset.key === key) btn.className = "stat-btn p-3 rounded-xl border flex flex-col items-center gap-2 transition-all bg-slate-950 border-white text-white shadow-lg";
                else btn.className = "stat-btn p-3 rounded-xl border flex flex-col items-center gap-2 transition-all bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-500";
            });
        };
        window.closeModal = () => document.getElementById('habit-modal').classList.add('hidden');

        function safeCreateIcons() { if (window.lucide) window.lucide.createIcons(); else setTimeout(safeCreateIcons, 100); }
        function showScreen(screenName) {
            document.getElementById('loading-overlay').classList.add('hidden');
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('dashboard-screen').classList.add('hidden');
            if (screenName === 'login') {
                document.getElementById('login-screen').classList.remove('hidden');
                // Check if running in iframe
                if (window.self !== window.top) {
                    document.getElementById('iframe-warning').classList.remove('hidden');
                }
            }
            if (screenName === 'dashboard') {
                document.getElementById('dashboard-screen').classList.remove('hidden');
                if (calendarInstance && state.ui.currentTab === 'tasks') {
                    calendarInstance.render();
                    setTimeout(() => calendarInstance.render(), 100);
                    setTimeout(() => calendarInstance.render(), 300);
                }
            }
        }
        function addGratitude() {
            if(!window.dateFns) return;
            const input = document.getElementById('gratitude-input');
            const val = input.value.trim();
            if (!val) return;
            state.gratitudeLogs.unshift({ id: crypto.randomUUID(), date: dateFns.format(state.ui.selectedDate, 'yyyy-MM-dd'), content: val, createdAt: new Date().toISOString() });
            updateStats(5, 'SOUL', 1);
            input.value = '';
            renderAll();
            saveData();
        }
        function updateStats(xpChange, statKey, statChange) {
            let { level, currentXp, nextLevelXp, attributes } = state.stats;
            currentXp = Math.max(0, currentXp + xpChange);
            attributes[statKey] = Math.max(1, attributes[statKey] + statChange);
            while (currentXp >= nextLevelXp) { currentXp -= nextLevelXp; level += 1; nextLevelXp = Math.floor(nextLevelXp * 1.2); }
            state.stats = { level, currentXp, nextLevelXp, attributes };
            renderStats();
            saveData();
        }

        function renderAll() { 
            renderStats(); renderDate(); renderHabits(); renderHeatmap(); renderGratitude(); renderTasks(); updateCalendarEvents(); safeCreateIcons(); 
            if (calendarInstance && state.ui.currentTab === 'tasks') {
                setTimeout(() => calendarInstance.render(), 100);
            }
            if (state.ui.currentTab === 'review') {
                renderReview();
            }
        }
        
        let reviewFilter = 'week';
        let customStartDateStr = '';
        let customEndDateStr = '';

        window.setReviewFilter = (filter) => {
            reviewFilter = filter;
            const filters = ['week', 'last_week', 'month', 'last_month', 'custom'];
            filters.forEach(f => {
                const el = document.getElementById(`filter-${f}`);
                if (el) {
                    el.className = filter === f 
                        ? 'px-4 py-1.5 rounded-lg text-sm font-bold bg-slate-800 text-white transition-colors' 
                        : 'px-4 py-1.5 rounded-lg text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors';
                }
            });

            const customContainer = document.getElementById('custom-date-container');
            if (filter === 'custom') {
                customContainer.classList.remove('hidden');
                // Don't render immediately if custom is selected, wait for Apply
            } else {
                customContainer.classList.add('hidden');
                renderReview();
            }
        };

        window.applyCustomDateRange = () => {
            const start = document.getElementById('custom-start-date').value;
            const end = document.getElementById('custom-end-date').value;
            if (!start || !end) {
                alert('Please select both start and end dates.');
                return;
            }
            if (new Date(start) > new Date(end)) {
                alert('Start date cannot be after end date.');
                return;
            }
            customStartDateStr = start;
            customEndDateStr = end;
            renderReview();
        };

        let reviewDoughnutChart = null;
        let reviewBarChart = null;

        function generateGradientColors(count) {
            const colors = [];
            for (let i = 0; i < count; i++) {
                const ratio = count <= 1 ? 0 : i / (count - 1);
                // Interpolate from Primary Orange (#ff6b35) to Amber/Yellow (#fcd34d)
                const r = Math.round(255 + ratio * (252 - 255));
                const g = Math.round(107 + ratio * (211 - 107));
                const b = Math.round(53 + ratio * (77 - 53));
                colors.push(`rgb(${r}, ${g}, ${b})`);
            }
            return colors;
        }

        function renderReview() {
            if (!window.dateFns) return;
            const now = new Date();
            let startDate = new Date(0);
            let endDate = now;

            if (reviewFilter === 'week') {
                startDate = dateFns.startOfWeek(now, { weekStartsOn: 1 });
            } else if (reviewFilter === 'last_week') {
                const lastWeek = dateFns.subWeeks(now, 1);
                startDate = dateFns.startOfWeek(lastWeek, { weekStartsOn: 1 });
                endDate = dateFns.endOfWeek(lastWeek, { weekStartsOn: 1 });
            } else if (reviewFilter === 'month') {
                startDate = dateFns.startOfMonth(now);
            } else if (reviewFilter === 'last_month') {
                const lastMonth = dateFns.subMonths(now, 1);
                startDate = dateFns.startOfMonth(lastMonth);
                endDate = dateFns.endOfMonth(lastMonth);
            } else if (reviewFilter === 'custom') {
                if (customStartDateStr && customEndDateStr) {
                    startDate = dateFns.startOfDay(new Date(customStartDateStr));
                    endDate = dateFns.endOfDay(new Date(customEndDateStr));
                } else {
                    // If custom is selected but no dates applied yet, don't render anything or show empty
                    startDate = new Date(8640000000000000); // Max date to show nothing
                    endDate = new Date(-8640000000000000);
                }
            }

            // Filter completed tasks and past meetings
            const completedItems = state.tasks.filter(t => {
                if (!t.date) return false;
                const itemDate = new Date(t.date);
                if (itemDate < startDate) return false;
                if (itemDate > endDate) return false;
                
                // If the filter is not custom, we might want to still restrict to past items up to 'now'
                // But for custom/last_week/last_month, we just use the endDate.
                // Let's ensure we only count things that are actually completed or past.
                if (reviewFilter === 'week' || reviewFilter === 'month') {
                    if (itemDate > now) return false;
                }

                if (t.type === 'meeting') {
                    // Consider meeting attended if its end time (or date) has passed
                    let endDateTime = itemDate;
                    if (t.endTime) {
                        endDateTime = new Date(`${t.date}T${t.endTime}`);
                    } else {
                        endDateTime.setHours(23, 59, 59);
                    }
                    return endDateTime <= now;
                } else {
                    return t.completed === true;
                }
            });

            let tasksCount = 0;
            let meetingsCount = 0;
            let totalHours = 0;
            const sourceStats = {}; // { sourceName: { hours: 0, count: 0, items: [] } }

            completedItems.forEach(item => {
                let hours = 0;
                
                if (item.type === 'meeting' && item.startTime && item.endTime && !item.allDay) {
                    const startStr = `${item.date}T${item.startTime}`;
                    const endStr = `${item.endDate || item.date}T${item.endTime}`;
                    const start = new Date(startStr);
                    const end = new Date(endStr);
                    let diff = (end - start) / (1000 * 60 * 60);
                    if (diff < 0 && !item.endDate) diff += 24; // Handle overnight meetings on the same date
                    hours = Math.max(0, Math.round(diff * 10) / 10);
                } else {
                    if (item.difficulty === 'quick') hours = 0.5;
                    else if (item.difficulty === 'easy') hours = 1;
                    else if (item.difficulty === 'medium') hours = 3;
                    else if (item.difficulty === 'hard') hours = 5;
                    else hours = 3; // fallback
                }

                if (item.type === 'task') tasksCount++;
                if (item.type === 'meeting') meetingsCount++;

                // Round totalHours to 1 decimal place to avoid floating point issues
                totalHours = Math.round((totalHours + hours) * 10) / 10;

                const source = item.source || 'Uncategorized';
                if (!sourceStats[source]) {
                    sourceStats[source] = { hours: 0, count: 0, items: [] };
                }
                sourceStats[source].hours = Math.round((sourceStats[source].hours + hours) * 10) / 10;
                sourceStats[source].count += 1;
                sourceStats[source].items.push({ ...item, calculatedHours: hours });
            });

            // Update Cards
            document.getElementById('review-tasks-count').innerText = tasksCount;
            document.getElementById('review-meetings-count').innerText = meetingsCount;
            document.getElementById('review-total-hours').innerText = totalHours + 'h';

            let topSource = '-';
            let maxHours = -1;
            for (const [src, stats] of Object.entries(sourceStats)) {
                if (stats.hours > maxHours && src !== 'Uncategorized') {
                    maxHours = stats.hours;
                    topSource = src;
                }
            }
            if (topSource === '-' && sourceStats['Uncategorized']) topSource = 'Uncategorized';
            document.getElementById('review-top-source').innerText = topSource;

            // Prepare Chart Data
            const allSources = Object.keys(sourceStats);
            
            // Sort by hours descending
            const sortedSources = [...allSources].sort((a, b) => sourceStats[b].hours - sourceStats[a].hours);
            
            // Group into Top 5 + Other for Doughnut
            const MAX_SLICES = 5;
            let doughnutLabels = [];
            let hoursData = [];
            let countsData = [];
            
            if (sortedSources.length > MAX_SLICES + 1) {
                const topSources = sortedSources.slice(0, MAX_SLICES);
                const otherSources = sortedSources.slice(MAX_SLICES);
                
                doughnutLabels = [...topSources, 'Other'];
                hoursData = topSources.map(src => sourceStats[src].hours);
                countsData = topSources.map(src => sourceStats[src].count);
                
                const otherHours = otherSources.reduce((sum, src) => sum + sourceStats[src].hours, 0);
                const otherCount = otherSources.reduce((sum, src) => sum + sourceStats[src].count, 0);
                
                hoursData.push(otherHours);
                countsData.push(otherCount);
            } else {
                doughnutLabels = [...sortedSources];
                hoursData = sortedSources.map(src => sourceStats[src].hours);
                countsData = sortedSources.map(src => sourceStats[src].count);
            }

            const doughnutColors = generateGradientColors(doughnutLabels.length);

            // Custom Plugin for Dashed Lines and Labels
            const dashedLinePlugin = {
                id: 'dashedLineLabels',
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    const meta = chart.getDatasetMeta(0);
                    const data = chart.data.datasets[0].data;
                    const counts = chart.data.datasets[0].counts;
                    const labels = chart.data.labels;

                    ctx.save();
                    meta.data.forEach((element, index) => {
                        if (data[index] === 0) return;

                        const xCenter = element.x;
                        const yCenter = element.y;
                        const outerRadius = element.outerRadius;
                        const angle = (element.startAngle + element.endAngle) / 2;
                        
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);

                        const x0 = xCenter + cos * outerRadius;
                        const y0 = yCenter + sin * outerRadius;
                        
                        const x1 = xCenter + cos * (outerRadius + 15);
                        const y1 = yCenter + sin * (outerRadius + 15);
                        
                        const x2 = x1 + (cos >= 0 ? 1 : -1) * 15;
                        const y2 = y1;

                        // Draw dashed line
                        ctx.beginPath();
                        ctx.setLineDash([3, 3]);
                        ctx.moveTo(x0, y0);
                        ctx.lineTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.strokeStyle = '#64748b'; // slate-500
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.setLineDash([]);

                        // Draw text
                        ctx.fillStyle = '#f8fafc'; // slate-50
                        ctx.font = '11px Inter, sans-serif';
                        ctx.textBaseline = 'middle';
                        ctx.textAlign = cos >= 0 ? 'left' : 'right';
                        
                        const textX = x2 + (cos >= 0 ? 6 : -6);
                        const text = `${labels[index]} (${data[index]}h, ${counts[index]}x)`;
                        ctx.fillText(text, textX, y2);
                    });
                    ctx.restore();
                }
            };

            // Doughnut Chart (Hours)
            const ctxDoughnut = document.getElementById('review-doughnut-chart');
            if (ctxDoughnut) {
                if (reviewDoughnutChart) reviewDoughnutChart.destroy();
                
                reviewDoughnutChart = new Chart(ctxDoughnut, {
                    type: 'doughnut',
                    data: {
                        labels: doughnutLabels,
                        datasets: [{
                            data: hoursData,
                            counts: countsData,
                            backgroundColor: doughnutColors,
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    plugins: [dashedLinePlugin],
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                            padding: 60
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const count = context.dataset.counts[context.dataIndex];
                                        return ` ${context.label}: ${context.raw}h (${count} items)`;
                                    }
                                }
                            },
                            datalabels: {
                                display: false
                            }
                        },
                        cutout: '60%'
                    }
                });
            }

            // Render Table
            const tableBody = document.getElementById('review-source-table-body');
            if (tableBody) {
                tableBody.innerHTML = '';
                if (sortedSources.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-slate-400">No data available</td></tr>';
                } else {
                    sortedSources.forEach((src, index) => {
                        const stats = sourceStats[src];
                        // Get color from gradient based on index, fallback to last color if out of bounds
                        const colorIndex = Math.min(index, doughnutColors.length - 1);
                        const color = doughnutColors[colorIndex] || '#ff6b35';
                        tableBody.innerHTML += `
                            <tr class="border-b border-slate-800/50 hover:bg-slate-900 transition-colors">
                                <td class="py-3 font-medium text-slate-300 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
                                    ${src}
                                </td>
                                <td class="py-3 text-right font-bold text-slate-300">${stats.hours}h</td>
                                <td class="py-3 text-right text-slate-400">${stats.count}</td>
                            </tr>
                        `;
                    });
                }
            }

            // Render History List
            const historyContainer = document.getElementById('review-history-list');
            if (!historyContainer) return;
            historyContainer.innerHTML = '';

            if (allSources.length === 0) {
                historyContainer.innerHTML = '<div class="text-slate-400 text-sm text-center py-8 col-span-full">No achievements found in this period.</div>';
                return;
            }

            // Use the already sorted 'sortedSources' array for the history list
            sortedSources.forEach(src => {
                const stats = sourceStats[src];
                // Sort items by date descending
                stats.items.sort((a, b) => new Date(b.date) - new Date(a.date));

                let html = `
                    <div class="clean-card p-4 rounded-xl border border-slate-800 bg-slate-800/20 h-fit">
                        <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                            <h4 class="text-sm font-bold text-white flex items-center gap-2">
                                <i data-lucide="folder" class="w-4 h-4 text-[#ff6b35]"></i> ${src}
                            </h4>
                            <span class="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">${stats.hours}h total</span>
                        </div>
                        <div class="space-y-2 pl-1">
                `;

                stats.items.forEach(item => {
                    const icon = item.type === 'meeting' ? 'calendar' : 'check-circle-2';
                    const iconColor = item.type === 'meeting' ? 'text-[#ff6b35]' : 'text-[#ff6b35]';
                    const diffColors = {
                        quick: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
                        easy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                        medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                        hard: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                    };
                    const diffClass = diffColors[item.difficulty] || diffColors.medium;
                    const dateStr = window.dateFns ? dateFns.format(new Date(item.date), 'MMM d') : item.date;
                    const onClickHandler = item.type === 'meeting' ? `window.openMeetingModal(null, state.tasks.find(t => t.id === '${item.id}'))` : `window.openTaskModal('${item.id}')`;

                    const bookmarkClass = item.isBookmarked ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50' : 'hover:bg-slate-800/50 border-transparent hover:border-slate-800';

                    html += `
                        <div onclick="${onClickHandler}" class="flex items-center justify-between p-2 rounded-lg transition-colors border cursor-pointer ${bookmarkClass}">
                            <div class="flex items-center gap-3 overflow-hidden">
                                ${item.isBookmarked ? '<i data-lucide="bookmark" class="w-4 h-4 text-yellow-500 shrink-0 fill-yellow-500/20"></i>' : `<i data-lucide="${icon}" class="w-4 h-4 ${iconColor} shrink-0"></i>`}
                                <div class="flex flex-col truncate">
                                    <span class="text-sm font-medium text-slate-300 truncate">${item.title}</span>
                                    <span class="text-xs text-slate-400">${dateStr}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0 ml-2">
                                <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${diffClass}">${item.difficulty || 'medium'}</span>
                                <span class="text-xs font-bold text-slate-400 w-6 text-right">${item.calculatedHours}h</span>
                            </div>
                        </div>
                    `;
                });

                html += `</div></div>`;
                historyContainer.innerHTML += html;
            });

            if (window.lucide) window.lucide.createIcons({ root: historyContainer });
        }

        function updateCalendarEvents() {
            if (!calendarInstance) return;
            const events = [];
            
            state.tasks.filter(t => t.date).forEach(t => {
                const isMeeting = t.type === 'meeting';
                const isAllDay = t.allDay || (!t.startTime);
                
                let start = t.date;
                if (!isAllDay && t.startTime) {
                    start = `${t.date}T${t.startTime}`;
                }
                
                let end = null;
                if (!isAllDay && t.endTime) {
                    const endDateStr = t.endDate || t.date;
                    end = `${endDateStr}T${t.endTime}`;
                } else if (isAllDay && t.endDate) {
                    const endDate = new Date(t.endDate);
                    if (!isNaN(endDate.getTime())) {
                        endDate.setDate(endDate.getDate() + 1);
                        end = window.dateFns ? window.dateFns.format(endDate, 'yyyy-MM-dd') : t.endDate;
                    }
                }
                
                let bgColor = t.completed ? '#334155' : (isMeeting ? 'transparent' : 'rgba(255, 107, 53, 0.2)');
                let txtColor = t.completed ? '#94a3b8' : (isMeeting ? '#ffffff' : '#ff6b35');
                let brdColor = t.completed ? 'transparent' : (isMeeting ? '#ffffff' : 'transparent');

                if (t.isBookmarked) {
                    bgColor = 'rgba(234, 179, 8, 0.2)'; // yellow-500/20
                    txtColor = '#eab308'; // yellow-500
                    brdColor = '#eab308';
                }

                const baseEvent = {
                    id: t.id,
                    title: t.title,
                    start: start,
                    end: end,
                    allDay: isAllDay,
                    backgroundColor: bgColor,
                    textColor: txtColor,
                    borderColor: brdColor,
                    extendedProps: {
                        isMeeting: isMeeting,
                        completed: t.completed,
                        difficulty: t.difficulty,
                        startTime: t.startTime,
                        endTime: t.endTime,
                        isBookmarked: t.isBookmarked
                    }
                };
                
                events.push(baseEvent);
                
                if (t.recurrence && t.recurrence !== 'none' && window.dateFns) {
                    let currentDate = new Date(t.date);
                    const limitDate = t.recurrenceUntil ? new Date(t.recurrenceUntil) : dateFns.addYears(new Date(), 2);
                    const hardLimit = dateFns.addYears(new Date(), 2);
                    const finalLimit = limitDate < hardLimit ? limitDate : hardLimit;
                    
                    let i = 0;
                    while (currentDate <= finalLimit && i < 730) {
                        i++;
                        if (t.recurrence === 'daily') currentDate = dateFns.addDays(currentDate, 1);
                        else if (t.recurrence === 'weekly') currentDate = dateFns.addWeeks(currentDate, 1);
                        else if (t.recurrence === 'monthly') currentDate = dateFns.addMonths(currentDate, 1);
                        else if (t.recurrence === 'yearly') currentDate = dateFns.addYears(currentDate, 1);
                        
                        if (currentDate > finalLimit) break;
                        
                        const dateStr = dateFns.format(currentDate, 'yyyy-MM-dd');
                        let recStart = dateStr;
                        if (!isAllDay && t.startTime) recStart = `${dateStr}T${t.startTime}`;
                        
                        let recEnd = null;
                        if (!isAllDay && t.endTime) {
                            const originalStartDate = new Date(t.date);
                            const originalEndDate = new Date(t.endDate || t.date);
                            const diffDays = dateFns.differenceInDays(originalEndDate, originalStartDate);
                            const newEndDate = dateFns.addDays(currentDate, diffDays);
                            recEnd = `${dateFns.format(newEndDate, 'yyyy-MM-dd')}T${t.endTime}`;
                        } else if (isAllDay && t.endDate) {
                            const originalStartDate = new Date(t.date);
                            const originalEndDate = new Date(t.endDate);
                            const diffDays = dateFns.differenceInDays(originalEndDate, originalStartDate);
                            const newEndDate = dateFns.addDays(currentDate, diffDays + 1);
                            recEnd = dateFns.format(newEndDate, 'yyyy-MM-dd');
                        }
                        
                        events.push({
                            ...baseEvent,
                            id: `${t.id}_${dateStr}`,
                            start: recStart,
                            end: recEnd
                        });
                    }
                }
            });
            
            calendarInstance.removeAllEvents();
            calendarInstance.addEventSource(events);
        }

        window.changeCalView = (viewName) => {
            if(calendarInstance) {
                calendarInstance.changeView(viewName);
                document.querySelectorAll('.cal-view-btn').forEach(btn => {
                    if(btn.dataset.view === viewName) {
                        btn.className = 'cal-view-btn px-3 py-1 text-xs font-bold rounded-md bg-[#ff6b35]/20 text-[#ff6b35] transition-colors';
                    } else {
                        btn.className = 'cal-view-btn px-3 py-1 text-xs font-bold rounded-md text-slate-400 hover:text-white transition-colors';
                    }
                });
            }
        };

        let tokenClient;
        let gcalAccessToken = null;

        window.syncGoogleCalendar = () => {
            if (!navigator.onLine) {
                alert("同步功能需要網路連線。 (Offline)");
                return;
            }

            if (!tokenClient) {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: '661946797483-9m4f8dgl98nqsi14g4ltb4pr7igr77ca.apps.googleusercontent.com',
                    scope: 'https://www.googleapis.com/auth/calendar.events',
                    callback: async (response) => {
                        if (response.error !== undefined) {
                            console.error('GIS Error:', response);
                            return;
                        }
                        gcalAccessToken = response.access_token;
                        await performGCalSync();
                    },
                });
            }

            if (gcalAccessToken) {
                performGCalSync();
            } else {
                tokenClient.requestAccessToken({prompt: 'consent'});
            }
        };

        async function performGCalSync() {
            const btn = document.getElementById('sync-gcal-btn');
            const originalHtml = btn.innerHTML;
            const loadingHtml = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Syncing...';
            
            if (btn) btn.innerHTML = loadingHtml;
            if (window.lucide) window.lucide.createIcons();

            try {
                const viewStart = calendarInstance.view.currentStart;
                const viewEnd = calendarInstance.view.currentEnd;
                
                const meetingsToSync = state.tasks.filter(t => t.type === 'meeting' && !t.gcalSynced);
                let syncedCount = 0;

                for (const t of meetingsToSync) {
                    const taskStart = new Date(t.date);
                    let taskEnd = t.endDate ? new Date(t.endDate) : taskStart;
                    if (t.recurrence && t.recurrence !== 'none') {
                        // For recurring events, we estimate an end date or just assume it extends
                        taskEnd = t.recurrenceUntil ? new Date(t.recurrenceUntil) : new Date(viewEnd.getTime() + 86400000); 
                    }

                    // Check if meeting intersects the current view area
                    if (taskStart <= viewEnd && taskEnd >= viewStart) {
                        const eventBody = {
                            summary: t.title || 'Untitled Meeting',
                            description: (t.notes || '') + (t.source ? `\n\nSource: ${t.source}` : ''),
                        };

                        if (t.allDay || !t.startTime) {
                            eventBody.start = { date: t.date };
                            let endDate = new Date(t.endDate || t.date);
                            endDate.setDate(endDate.getDate() + 1);
                            eventBody.end = { date: window.dateFns ? window.dateFns.format(endDate, 'yyyy-MM-dd') : endDate.toISOString().split('T')[0] };
                        } else {
                            const localStart = new Date(`${t.date}T${t.startTime}`);
                            const endDateStr = t.endDate || t.date;
                            const localEnd = new Date(`${endDateStr}T${t.endTime || t.startTime}`);
                            
                            eventBody.start = { dateTime: localStart.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
                            eventBody.end = { dateTime: localEnd.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
                        }

                        if (t.recurrence && t.recurrence !== 'none') {
                            let freq = t.recurrence.toUpperCase();
                            let rrule = `RRULE:FREQ=${freq}`;
                            if (t.recurrenceUntil) {
                                const untilStr = t.recurrenceUntil.replace(/-/g, '') + 'T235959Z';
                                rrule += `;UNTIL=${untilStr}`;
                            }
                            eventBody.recurrence = [rrule];
                        }

                        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${gcalAccessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(eventBody)
                        });

                        if (res.ok) {
                            const data = await res.json();
                            t.gcalSynced = true;
                            t.gcalEventId = data.id;
                            syncedCount++;
                        } else {
                            console.error('Failed to sync event to GCal:', await res.text());
                        }
                    }
                }

                if (syncedCount > 0) {
                    saveData();
                    renderAll();
                    alert(`Successfully synced ${syncedCount} new meeting(s) to Google Calendar!`);
                } else {
                    alert('No new unsynced meetings found in this view.');
                }
            } catch (err) {
                console.error("GCal Sync Error:", err);
                alert("Failed to sync with Google Calendar. See console for details.");
            } finally {
                if (btn) btn.innerHTML = originalHtml;
                if (window.lucide) window.lucide.createIcons();
            }
        }

        function initCalendar() {
            const calendarEl = document.getElementById('calendar');
            if (calendarEl && window.FullCalendar) {
                calendarInstance = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'timeGridWeek',
                    scrollTime: '09:00:00',
                    headerToolbar: false,
                    height: '100%',
                    nowIndicator: true,
                    dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric', omitCommas: true },
                    dayHeaderContent: (args) => {
                        const date = args.date;
                        const dayStr = args.text.split(' ')[0] || '';
                        const dateStr = args.text.split(' ')[1] || '';
                        return { html: `<div class="cal-col-header-day">${dayStr}</div><div class="cal-col-header-date">${dateStr}</div>` };
                    },
                    events: [],
                    editable: true, // Enable drag and drop
                    datesSet: function(arg) {
                        const titleEl = document.getElementById('calendar-title');
                        if (titleEl) {
                            if (arg.view.type === 'timeGridWeek') {
                                const start = arg.start;
                                // Simple week number calc
                                const d = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
                                const dayNum = d.getUTCDay() || 7;
                                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                                const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
                                const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
                                
                                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                const monthStr = monthNames[start.getMonth()] + ' ' + start.getFullYear();
                                titleEl.textContent = `${monthStr} · Week ${weekNo}`;
                            } else {
                                titleEl.textContent = arg.view.title;
                            }
                        }
                    },
                    eventContent: function(arg) {
                        const props = arg.event.extendedProps;
                        const isMeeting = props.isMeeting;
                        const completed = props.completed;
                        const isMonthView = arg.view.type === 'dayGridMonth';
                        
                        let html = '';
                        const title = arg.event.title;
                        const source = props.source ? props.source.toLowerCase() : '';
                        
                        const getHexColor = (src) => {
                            if (!src) return '#ff6b35';
                            const s = src.toLowerCase();
                            if (s.includes('royal')) return '#ff6b35';
                            if (s.includes('eliza') || s.includes('journey') || s.includes('wiki')) return '#10b981';
                            if (s.includes('sogo')) return '#eab308';
                            if (s.includes('erty') || s.includes('fish')) return '#60a5fa';
                            const colors = ['#10b981', '#60a5fa', '#eab308', '#ff6b35', '#c084fc', '#f472b6'];
                            let hash = 0;
                            for (let i = 0; i < src.length; i++) hash = src.charCodeAt(i) + ((hash << 5) - hash);
                            return colors[Math.abs(hash) % colors.length];
                        };

                        let drawColor = getHexColor(source);
                        
                        let borderColor, bgColor, textColor, icon;
                        
                        if (isMeeting) {
                            borderColor = '#cbd5e1';
                            bgColor = 'transparent';
                            textColor = '#cbd5e1';
                            icon = '';
                        } else if (completed) {
                            borderColor = 'transparent';
                            bgColor = 'transparent';
                            textColor = '#64748b';
                            icon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;flex-shrink:0;color:#64748b;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                        } else {
                            borderColor = drawColor;
                            bgColor = 'transparent'; // No background fill
                            textColor = drawColor;
                            icon = `<div style="width:10px;height:10px;border:1.5px solid ${drawColor};border-radius:50%;margin-right:4px;flex-shrink:0;"></div>`;
                        }
                        
                        const timeText = (arg.timeText && !isMonthView) ? `<span style="opacity:0.7;font-size:9px;margin-left:4px;">${arg.timeText}</span>` : '';
                        
                        // We set outer border if not completed and not meeting, mimicking image 1 exactly!
                        // Oh wait, image 1 has a solid background with colored border around it IF it is a specific label...
                        // If they liked the `border: 1px solid ${borderColor}50; background: ${borderColor}10;`, let's just restore that exactly but with the colors.
                        
                        html = `
                            <div class="w-full h-full flex items-center overflow-hidden px-1.5 py-0.5 rounded-[4px]" style="border: 1px solid ${completed ? 'transparent' : borderColor}; background: ${completed ? 'transparent' : bgColor};">
                                ${icon}
                                <div class="font-medium text-[11px] leading-tight truncate" style="color: ${textColor}">${title}</div>
                                ${timeText}
                            </div>
                        `;
                        
                        return { html: html };
                    },
                    eventDrop: function(info) {
                        const newDate = dateFns.format(info.event.start, 'yyyy-MM-dd');
                        const task = state.tasks.find(t => t.id === info.event.id);
                        if (task) {
                            task.date = newDate;
                            if (task.type === 'meeting') {
                                if (!info.event.allDay) {
                                    task.startTime = dateFns.format(info.event.start, 'HH:mm');
                                    if (info.event.end) {
                                        task.endTime = dateFns.format(info.event.end, 'HH:mm');
                                    } else {
                                        // Default to 1 hour if no end time is provided by the drop
                                        const endDate = dateFns.addHours(info.event.start, 1);
                                        task.endTime = dateFns.format(endDate, 'HH:mm');
                                    }
                                } else {
                                    task.startTime = '';
                                    task.endTime = '';
                                }
                            } else {
                                // If a task is dropped into a time slot, we could convert it to a meeting,
                                // but for now we just update its date and keep it as an all-day task.
                                // FullCalendar might render it at the time slot until we refresh events.
                            }
                            window.renderTasks();
                            window.updateCalendarEvents();
                            window.saveData();
                        }
                    },
                    eventResize: function(info) {
                        const task = state.tasks.find(t => t.id === info.event.id);
                        if (task && task.type === 'meeting' && !info.event.allDay && info.event.end) {
                            task.endTime = dateFns.format(info.event.end, 'HH:mm');
                            window.renderTasks();
                            window.updateCalendarEvents();
                            window.saveData();
                        }
                    },
                    dateClick: function(info) {
                        const hasTime = info.dateStr.includes('T');
                        if (hasTime) {
                            window.openMeetingModal(info);
                        } else {
                            state.ui.newTaskDate = info.dateStr;
                            const input = document.getElementById('new-task-input');
                            input.placeholder = `Add task for ${info.dateStr}... (Enter to save)`;
                            
                            // Also update the date picker in the options panel
                            const datePicker = document.getElementById('new-task-date-picker');
                            if (datePicker) {
                                datePicker.value = info.dateStr;
                                // Reset date buttons since it's a custom date
                                const dateBtns = document.querySelectorAll('#task-date-btns .date-btn');
                                dateBtns.forEach(b => {
                                    b.className = 'date-btn px-3 py-1.5 rounded-md text-xs font-bold border border-slate-800 text-slate-400 hover:text-white transition-colors';
                                });
                            }
                            
                            input.focus();
                        }
                    },
                    eventClick: function(info) {
                        const task = state.tasks.find(t => t.id === info.event.id);
                        if (task) {
                            if (task.type === 'meeting') {
                                window.openMeetingModal(null, task);
                            } else {
                                window.openTaskModal(info.event.id);
                            }
                        }
                    }
                });
                calendarInstance.render();
                updateCalendarEvents();
            }
        }

        function renderTasks() {
            const activeList = document.getElementById('active-tasks-list');
            const waitingList = document.getElementById('waiting-tasks-list');
            const completedList = document.getElementById('completed-tasks-list');
            const waitingCount = document.getElementById('waiting-tasks-count');
            const completedCount = document.getElementById('completed-tasks-count');
            
            if (!activeList || !waitingList || !completedList) return;

            activeList.innerHTML = '';
            waitingList.innerHTML = '';
            completedList.innerHTML = '';
            
            let waitingTasksCount = 0;
            let completedTasksCount = 0;
            let activeTasksCount = 0;

            const createTaskHTML = (task) => {
                const isExpanded = state.ui.expandedTaskId === task.id;
                const isCompleted = task.completed;
                const isMeeting = task.type === 'meeting';
                const isBookmarked = task.isBookmarked;
                
                const diffMap = { quick: 'Q', easy: 'E', medium: 'M', hard: 'H' };
                let diffColor = 'text-emerald-500 border-emerald-500/20'; // default easy
                if (task.difficulty === 'quick') {
                    diffColor = 'text-blue-400 border-blue-400/20';
                } else if (task.difficulty === 'medium') {
                    diffColor = 'text-[#ff6b35] border-[#ff6b35]/20';
                } else if (task.difficulty === 'hard') {
                    diffColor = 'text-red-500 border-red-500/20';
                }
                
                if (isCompleted) {
                    diffColor = 'text-slate-400 border-slate-500/20';
                }

                const getColorForSource = (source) => {
                    if (!source) return 'text-slate-400';
                    if (isCompleted) return 'text-slate-400';
                    const s = source.toLowerCase();
                    if (s.includes('royal')) return 'text-[#ff6b35]';
                    if (s.includes('eliza') || s.includes('journey') || s.includes('wiki')) return 'text-emerald-500';
                    if (s.includes('sogo')) return 'text-yellow-500';
                    if (s.includes('erty') || s.includes('fish')) return 'text-blue-400';
                    const colors = ['text-emerald-500', 'text-blue-400', 'text-yellow-500', 'text-[#ff6b35]', 'text-purple-400', 'text-pink-400'];
                    let hash = 0;
                    for (let i = 0; i < source.length; i++) hash = source.charCodeAt(i) + ((hash << 5) - hash);
                    return colors[Math.abs(hash) % colors.length];
                };

                let containerClass = `task-item bg-transparent hover:bg-slate-900/50 rounded-xl p-2 sm:p-3 transition-colors border ${isExpanded ? 'border-[#ff6b35]/50' : 'border-transparent'}`;
                if (isBookmarked) {
                    containerClass = `task-item bg-yellow-500/5 border ${isExpanded ? 'border-yellow-400/50' : 'border-transparent'} rounded-xl p-2 sm:p-3 transition-colors`;
                }

                let html = `
                <div id="task-el-${task.id}" data-id="${task.id}" class="${containerClass}">
                    <div class="flex items-center gap-3 cursor-pointer" onclick="window.expandTask('${task.id}')">
                        <div class="drag-handle cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 opacity-50 flex-shrink-0" onclick="event.stopPropagation()">
                            <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                        </div>
                        <div onclick="event.stopPropagation(); window.toggleTask('${task.id}')" class="w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${isCompleted ? 'border-[#475569] bg-[#475569]' : 'border-slate-400 hover:border-slate-600'}">
                            ${isCompleted ? '<i data-lucide="check" class="w-3.5 h-3.5 text-white stroke-[3]"></i>' : (isMeeting ? '<i data-lucide="users" class="w-3 h-3 text-slate-400"></i>' : '')}
                        </div>
                        
                        ${task.source ? `
                        <div class="flex-shrink-0 w-20">
                            <span class="text-[10px] font-bold uppercase tracking-widest ${getColorForSource(task.source)}">
                                ${task.source}
                            </span>
                        </div>
                        ` : ''}

                        <div class="flex-1 min-w-0">
                            <h4 class="text-[13px] font-medium ${isCompleted ? 'text-slate-400' : 'text-slate-300'} truncate">${task.title}</h4>
                        </div>

                        ${isBookmarked ? `
                        <div class="flex-shrink-0 text-yellow-500">
                            <i data-lucide="bookmark" class="w-4 h-4 fill-yellow-500/20"></i>
                        </div>
                        ` : ''}

                        <div class="flex items-center gap-2 flex-shrink-0">
                            ${task.time ? `<span class="text-xs text-slate-400 font-medium">${task.time}</span>` : ''}
                        </div>
                    </div>
                `;

                if (isExpanded) {
                    html += `
                    <div class="mt-4 pt-4 border-t border-slate-800 space-y-4 fade-in">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Title</label>
                            <input type="text" value="${task.title}" onblur="window.updateTask('${task.id}', 'title', this.value)" onchange="window.updateTask('${task.id}', 'title', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-[#ff6b35] outline-none transition-colors">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
                            <input type="text" value="${task.notes || ''}" onblur="window.updateTask('${task.id}', 'notes', this.value)" onchange="window.updateTask('${task.id}', 'notes', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-[#ff6b35] outline-none transition-colors" placeholder="Add notes...">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Source</label>
                            <input type="text" value="${task.source || ''}" onblur="window.updateTask('${task.id}', 'source', this.value)" onchange="window.updateTask('${task.id}', 'source', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-[#ff6b35] outline-none transition-colors">
                        </div>
                        ${isMeeting ? `
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Time</label>
                            <div class="flex items-center gap-2">
                                <input type="time" value="${task.startTime || ''}" onblur="window.updateTask('${task.id}', 'startTime', this.value)" onchange="window.updateTask('${task.id}', 'startTime', this.value)" class="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-[#ff6b35] outline-none transition-colors">
                                <span class="text-slate-400 text-xs font-bold">to</span>
                                <input type="time" value="${task.endTime || ''}" onblur="window.updateTask('${task.id}', 'endTime', this.value)" onchange="window.updateTask('${task.id}', 'endTime', this.value)" class="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-[#ff6b35] outline-none transition-colors">
                            </div>
                        </div>
                        ` : `
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Difficulty</label>
                            <div class="grid grid-cols-4 gap-2">
                                <button type="button" onclick="window.updateTask('${task.id}', 'difficulty', 'quick')" class="py-2 rounded-lg text-xs font-bold border ${task.difficulty === 'quick' ? 'border-[#ff6b35] bg-[#ff6b35]/10 text-[#ff6b35]' : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-500'} transition-colors">Quick</button>
                                <button type="button" onclick="window.updateTask('${task.id}', 'difficulty', 'easy')" class="py-2 rounded-lg text-xs font-bold border ${task.difficulty === 'easy' ? 'border-[#ff6b35] bg-[#ff6b35]/10 text-[#ff6b35]' : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-500'} transition-colors">Easy</button>
                                <button type="button" onclick="window.updateTask('${task.id}', 'difficulty', 'medium')" class="py-2 rounded-lg text-xs font-bold border ${task.difficulty === 'medium' ? 'border-[#ff6b35] bg-[#ff6b35]/10 text-[#ff6b35]' : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-500'} transition-colors">Medium</button>
                                <button type="button" onclick="window.updateTask('${task.id}', 'difficulty', 'hard')" class="py-2 rounded-lg text-xs font-bold border ${task.difficulty === 'hard' ? 'border-[#ff6b35] bg-[#ff6b35]/10 text-[#ff6b35]' : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-500'} transition-colors">Hard</button>
                            </div>
                        </div>
                        `}
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="window.updateTask('${task.id}', 'date', window.dateFns.format(new Date(), 'yyyy-MM-dd'))" class="px-3 py-2.5 rounded-lg text-xs font-bold border border-slate-800 text-slate-400 hover:text-white hover:border-slate-500 transition-colors whitespace-nowrap">Today</button>
                                <button type="button" onclick="window.updateTask('${task.id}', 'date', window.dateFns.format(window.dateFns.addDays(new Date(), 1), 'yyyy-MM-dd'))" class="px-3 py-2.5 rounded-lg text-xs font-bold border border-slate-800 text-slate-400 hover:text-white hover:border-slate-500 transition-colors whitespace-nowrap">Tomorrow</button>
                                <input type="date" value="${task.date}" onblur="window.updateTask('${task.id}', 'date', this.value)" onchange="window.updateTask('${task.id}', 'date', this.value)" class="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-[#ff6b35] outline-none transition-colors">
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 mt-2 border-t border-slate-800/50 gap-3">
                            <button onclick="window.deleteTask('${task.id}')" class="p-2.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors" title="Delete">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                            <div class="flex items-center gap-2">
                                <button onclick="window.toggleBookmark('${task.id}')" class="p-2.5 rounded-lg ${isBookmarked ? 'text-yellow-500 bg-yellow-500/10 border border-yellow-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'} transition-colors" title="${isBookmarked ? 'Unbookmark' : 'Bookmark'}">
                                    <i data-lucide="bookmark" class="w-4 h-4 ${isBookmarked ? 'fill-yellow-500/20' : ''}"></i>
                                </button>
                                <button onclick="window.updateTask('${task.id}', 'isWaiting', ${!task.isWaiting})" class="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="${task.isWaiting ? 'Move to Active' : 'Wait'}">
                                    <i data-lucide="clock" class="w-4 h-4"></i>
                                </button>
                                <button onclick="window.expandTask(null)" class="text-xs font-bold text-white bg-[#ff6b35] hover:bg-[#ff8c61] px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-[#ff6b35]/20">
                                    <i data-lucide="check" class="w-4 h-4"></i> Save
                                </button>
                            </div>
                        </div>
                    </div>
                    `;
                }

                html += `</div>`;
                return html;
            };

            // Sort tasks: incomplete first, then by order property, then by createdAt descending
            const searchQuery = (document.getElementById('task-search-input')?.value || '').toLowerCase();
            
            const sortedTasks = [...state.tasks].filter(t => {
                if (t.type === 'meeting') return false;
                if (state.ui.taskFilterSource && t.source !== state.ui.taskFilterSource) return false;
                if (searchQuery) {
                    const titleMatch = (t.title || '').toLowerCase().includes(searchQuery);
                    const sourceMatch = (t.source || '').toLowerCase().includes(searchQuery);
                    const notesMatch = (t.notes || '').toLowerCase().includes(searchQuery);
                    return titleMatch || sourceMatch || notesMatch;
                }
                return true;
            }).sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });

            sortedTasks.forEach(task => {
                if (task.completed) {
                    completedList.innerHTML += createTaskHTML(task);
                    completedTasksCount++;
                } else if (task.isWaiting) {
                    waitingList.innerHTML += createTaskHTML(task);
                    waitingTasksCount++;
                } else {
                    activeList.innerHTML += createTaskHTML(task);
                    activeTasksCount++;
                }
            });

            if (activeList.innerHTML === '') {
                activeList.innerHTML = `<div class="text-center py-8 border-2 border-dashed border-slate-800/50 rounded-xl text-slate-600"><p class="text-sm">No active tasks. You're all caught up!</p></div>`;
            }
            if (waitingList.innerHTML === '') {
                waitingList.innerHTML = `<div class="text-center py-4 border-2 border-dashed border-slate-800/50 rounded-xl text-slate-600"><p class="text-sm">No waiting tasks.</p></div>`;
            }
            
            if (waitingCount) waitingCount.innerText = waitingTasksCount;
            if (completedCount) completedCount.innerText = completedTasksCount;
            
            const tasksBadge = document.getElementById('tasks-count-badge');
            if (tasksBadge) tasksBadge.innerText = activeTasksCount;
            
            if (window.renderTaskFilterChips) {
                renderTaskFilterChips();
            }

            safeCreateIcons();

            // Initialize Sortable
            if (window.Sortable) {
                const updateTaskOrderAndState = () => {
                    Array.from(activeList.children).forEach((el, index) => {
                        const task = state.tasks.find(t => t.id === el.dataset.id);
                        if (task) { task.order = index; task.isWaiting = false; }
                    });
                    Array.from(waitingList.children).forEach((el, index) => {
                        const task = state.tasks.find(t => t.id === el.dataset.id);
                        if (task) { task.order = index; task.isWaiting = true; }
                    });
                    saveData();
                };

                if (activeList._sortable) activeList._sortable.destroy();
                activeList._sortable = new Sortable(activeList, {
                    group: 'tasks',
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'opacity-50',
                    onEnd: function(evt) {
                        updateTaskOrderAndState();
                        if (evt.to !== evt.from) renderTasks(); // Re-render if moved between lists
                    }
                });
                if (waitingList._sortable) waitingList._sortable.destroy();
                waitingList._sortable = new Sortable(waitingList, {
                    group: 'tasks',
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'opacity-50',
                    onEnd: function(evt) {
                        updateTaskOrderAndState();
                        if (evt.to !== evt.from) renderTasks(); // Re-render if moved between lists
                    }
                });
                if (completedList._sortable) completedList._sortable.destroy();
                completedList._sortable = new Sortable(completedList, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'opacity-50',
                    onEnd: function() {
                        const newOrder = Array.from(completedList.children).map(el => el.dataset.id);
                        newOrder.forEach((id, index) => {
                            const task = state.tasks.find(t => t.id === id);
                            if (task) task.order = index;
                        });
                        saveData();
                    }
                });
            }
        }

        function renderDate() {
            if(!window.dateFns) return;
            const today = new Date();
            const headerDateFmt = dateFns.format(today, 'E &bull; MMM d');
            const hDisplay = document.getElementById('header-date-display');
            if (hDisplay) hDisplay.innerHTML = headerDateFmt;

            if(document.getElementById('selected-date-display')) {
                const isToday = dateFns.isSameDay(state.ui.selectedDate, today);
                const fmt = dateFns.format(state.ui.selectedDate, 'MMMM d, yyyy');
                document.getElementById('selected-date-display').innerText = isToday ? 'Today' : fmt;
            }
        }
        function renderStats() {
            const { level, currentXp, nextLevelXp, attributes } = state.stats;
            // Update Header
            const lvlEl = document.getElementById('top-level');
            const xpCurrentEl = document.getElementById('top-xp-current');
            const xpNextEl = document.getElementById('top-xp-next');
            const xpBarEl = document.getElementById('top-xp-bar');
            
            if(lvlEl) lvlEl.innerText = level;
            if(xpCurrentEl) xpCurrentEl.innerText = Math.floor(currentXp);
            if(xpNextEl) xpNextEl.innerText = nextLevelXp;
            if(xpBarEl) {
                const pct = Math.min(100, (currentXp / nextLevelXp) * 100);
                xpBarEl.style.width = `${pct}%`;
            }

            // Update Stats Values in List
            if(document.getElementById('val-body')) document.getElementById('val-body').innerText = attributes.BODY;
            if(document.getElementById('val-mind')) document.getElementById('val-mind').innerText = attributes.MIND;
            if(document.getElementById('val-soul')) document.getElementById('val-soul').innerText = attributes.SOUL;
            
            const ctx = document.getElementById('radarChart');
            if (typeof Chart !== 'undefined' && ctx) {
                if (radarChartInstance) radarChartInstance.destroy();
                radarChartInstance = new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: ['Body', 'Mind', 'Soul'], 
                        datasets: [{
                            label: 'Stats',
                            data: [attributes.BODY, attributes.MIND, attributes.SOUL],
                            backgroundColor: 'rgba(255, 107, 53, 0.4)', // Slightly more transparent orange
                            borderColor: '#ff6b35',
                            borderWidth: 2,
                            pointBackgroundColor: '#fff', // White point center
                            pointBorderColor: '#ff6b35', // Orange border
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        layout: { padding: 5 }, // Reduced padding to maximize chart size
                        scales: {
                            r: {
                                angleLines: { color: 'rgba(255, 255, 255, 0.05)' }, // Very subtle lines
                                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                                pointLabels: { 
                                    display: true,
                                    color: '#94a3b8',
                                    font: { size: 12, weight: '600', family: 'Inter' }, // Slightly smaller font
                                    padding: 10
                                },
                                ticks: { display: false, backdropColor: 'transparent' },
                                suggestedMin: 0
                            }
                        },
                        plugins: { 
                            legend: { display: false },
                            tooltip: { 
                                backgroundColor: '#1e293b',
                                titleColor: '#fff',
                                titleFont: { size: 14, weight: 'bold' },
                                bodyColor: '#ff6b35',
                                bodyFont: { weight: 'bold' },
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderWidth: 1,
                                padding: 12,
                                displayColors: false,
                                callbacks: {
                                    title: (items) => items[0].label,
                                    label: (context) => `Stats : ${context.raw}`
                                }
                            }
                        },
                        maintainAspectRatio: false,
                        responsive: true
                    }
                });
            }
        }

        function renderHabits() {
            if(!window.dateFns) return;
            const dateStr = dateFns.format(state.ui.selectedDate, 'yyyy-MM-dd');
            const goodList = document.getElementById('good-habits-list');
            const badList = document.getElementById('bad-habits-list');
            goodList.innerHTML = ''; badList.innerHTML = '';

            const createHabitHTML = (habit) => {
                const isGood = habit.type === 'good';
                const isCompleted = habit.completedDates.includes(dateStr);
                const baseClass = "group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer";
                // Reduced opacity from /20 to /10 for less visual noise
                const bgClass = isCompleted 
                    ? (isGood ? 'bg-[#ff6b35]/10 border-[#ff6b35] shadow-lg shadow-orange-500/10' : 'bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/10') 
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-800 hover:bg-slate-800/50';
                const textClass = isCompleted ? 'text-white' : 'text-slate-300';
                const subTextClass = isCompleted ? 'text-white/80' : 'text-slate-400';
                
                // Logic for negative habits display
                const sign = isGood ? '+' : '-';
                
                return `
                <div onclick="window.toggleHabit('${habit.id}')" class="${baseClass} ${bgClass} fade-in relative overflow-hidden">
                    <div class="flex items-center gap-4 relative z-10">
                        <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${isCompleted ? 'border-white bg-slate-950/20' : 'border-slate-800 group-hover:border-slate-400'}">
                            ${isCompleted ? '<i data-lucide="check" class="w-3.5 h-3.5 text-white"></i>' : ''}
                        </div>
                        <div>
                            <h3 class="font-bold text-sm ${textClass} ${isCompleted ? 'line-through decoration-white/50' : ''}">${habit.title}</h3>
                            <div class="flex gap-2 text-[10px] items-center ${subTextClass} font-medium mt-0.5">
                                <span>${habit.stat} ${sign}${habit.statReward}</span>
                                <span>•</span>
                                <span>XP ${sign}${habit.xpReward}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="event.stopPropagation(); window.deleteHabit('${habit.id}')" class="p-2 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity relative z-20"><i data-lucide="trash" class="w-4 h-4"></i></button>
                </div>`;
            };
            state.habits.filter(h => h.type === 'good').forEach(h => goodList.innerHTML += createHabitHTML(h));
            state.habits.filter(h => h.type === 'bad').forEach(h => badList.innerHTML += createHabitHTML(h));
            if(goodList.innerHTML === '') goodList.innerHTML = `<div class="text-center py-6 border-2 border-dashed border-slate-800/50 rounded-xl text-slate-600"><p class="text-xs">No active quests today.</p></div>`;
            if(badList.innerHTML === '') badList.innerHTML = `<div class="text-center py-6 border-2 border-dashed border-slate-800/50 rounded-xl text-slate-600"><p class="text-xs">All clear.</p></div>`;
        }

        function renderHeatmap() {
            if(!window.dateFns) return;

            const renderGrid = (suffix, type) => {
                const grid = document.getElementById(`heatmap-grid-${suffix}`);
                const monthsContainer = document.getElementById(`heatmap-months-${suffix}`);
                if(!grid || !monthsContainer) return;
                
                grid.innerHTML = '';
                monthsContainer.innerHTML = '';
                
                const isPositive = type === 'good';
                const activeHabits = state.habits.filter(h => h.type === type);
                
                const today = new Date();
                const endOfCurrentMonth = dateFns.endOfMonth(today);
                const endOfGrid = dateFns.endOfWeek(endOfCurrentMonth, { weekStartsOn: 1 });
                const startDate = dateFns.subMonths(dateFns.startOfMonth(today), 3);
                const startOfGrid = dateFns.startOfWeek(startDate, { weekStartsOn: 1 });

                const days = dateFns.eachDayOfInterval({ start: startOfGrid, end: endOfGrid });
                const totalWeeks = Math.ceil(days.length / 7);
                
                let html = '';
                let currentMonth = -1;
                
                days.forEach((day, index) => {
                    const dateStr = dateFns.format(day, 'yyyy-MM-dd');
                    const isFuture = dateFns.isAfter(day, today);

                    if(day.getMonth() !== currentMonth && day.getDay() === 1) { 
                        currentMonth = day.getMonth();
                        const weekIdx = Math.floor(index / 7);
                        const leftPos = (weekIdx / totalWeeks) * 100;
                        if(leftPos < 90) { 
                           monthsContainer.innerHTML += `<div style="position:absolute; left:${leftPos}%">${dateFns.format(day, 'MMM')}</div>`;
                        }
                    }

                    const isSelected = dateFns.isSameDay(day, state.ui.selectedDate);
                    
                    let colorClass = 'bg-[#1e293b]';
                    if (isFuture) {
                         colorClass = 'bg-[#0f172a]';
                    } else {
                        let count = 0;
                        activeHabits.forEach(h => { if(h.completedDates.includes(dateStr)) count++; });
                        if(isPositive) count += state.gratitudeLogs.filter(g => g.date === dateStr).length;

                        if (count > 0) {
                            if (isPositive) colorClass = count > 2 ? 'bg-[#ff6b35]' : count > 1 ? 'bg-[#ff8c61]' : 'bg-[#ff8c61]/40';
                            else colorClass = count > 2 ? 'bg-rose-600' : count > 1 ? 'bg-rose-500' : 'bg-rose-500/40';
                        }
                    }
                    
                    const border = isSelected ? 'ring-2 ring-white z-20' : 'border border-transparent hover:border-white/50';
                    const cursor = isFuture ? 'cursor-default' : 'cursor-pointer';
                    const clickEvent = isFuture ? '' : `onclick="window.selectDate('${dateStr}')"`;

                    html += `<div ${clickEvent} data-tooltip="${isFuture ? '' : dateStr}" class="rounded-sm ${cursor} transition-all ${colorClass} ${border}"></div>`;
                });
                grid.innerHTML = html;
            };

            renderGrid('good', 'good');
            renderGrid('bad', 'bad');
        }

        function renderGratitude() {
            const historyContainer = document.getElementById('gratitude-history');
            if(!historyContainer) return;
            
            historyContainer.innerHTML = state.gratitudeLogs.slice(0, 30).map(entry => `
                <div class="bg-indigo-500/5 border border-indigo-500/20 p-3 rounded-xl flex justify-between items-center group fade-in hover:border-indigo-500/40 transition-colors">
                    <div class="flex flex-col gap-0.5 overflow-hidden">
                        <span class="text-[10px] font-mono text-slate-400">${entry.date}</span>
                        <p class="text-indigo-100 text-xs font-medium break-words">${entry.content}</p>
                    </div>
                    <button onclick="event.stopPropagation(); window.deleteGratitude('${entry.id}')" class="text-indigo-500/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 -mr-2 flex-shrink-0">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>`).join('');
                
             if(state.gratitudeLogs.length === 0) {
                 historyContainer.innerHTML = `<div class="text-center py-4 border-2 border-dashed border-slate-800/50 rounded-xl text-slate-600"><p class="text-xs">No entries yet.</p></div>`;
             }
        }

        function initNewTaskOptions() {
            const input = document.getElementById('new-task-input');
            const optionsPanel = document.getElementById('new-task-options');
            const container = document.getElementById('new-task-container');
            
            if (!input || !optionsPanel || !container) return;

            // Show panel on focus
            input.addEventListener('focus', () => {
                optionsPanel.classList.remove('hidden');
                optionsPanel.classList.add('flex');
                renderSourceChips();
            });

            // Hide panel when clicking outside
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    optionsPanel.classList.add('hidden');
                    optionsPanel.classList.remove('flex');
                }
            });

            // Handle Difficulty Buttons
            const diffBtns = document.querySelectorAll('#task-difficulty-btns .diff-btn');
            diffBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Reset all
                    diffBtns.forEach(b => {
                        b.className = 'diff-btn flex-1 py-1.5 rounded-md text-xs font-bold border border-slate-800 text-slate-400 hover:text-white transition-colors';
                        b.dataset.active = 'false';
                    });
                    // Set active
                    e.target.className = `diff-btn flex-1 py-1.5 rounded-md text-xs font-bold border border-[#ff6b35] bg-[#ff6b35]/10 text-[#ff6b35] transition-colors`;
                    e.target.dataset.active = 'true';
                });
            });

            // Handle Date Buttons
            const dateBtns = document.querySelectorAll('#task-date-btns .date-btn');
            const datePicker = document.getElementById('new-task-date-picker');
            
            const resetDateBtns = () => {
                dateBtns.forEach(b => {
                    b.className = 'date-btn px-3 py-1.5 rounded-md text-xs font-bold border border-slate-800 text-slate-400 hover:text-white transition-colors';
                });
            };

            dateBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    resetDateBtns();
                    e.target.className = `date-btn px-3 py-1.5 rounded-md text-xs font-bold border border-[#ff6b35] bg-[#ff6b35]/10 text-[#ff6b35] transition-colors`;
                    
                    const type = e.target.dataset.date;
                    if (type === 'none') {
                        datePicker.value = '';
                        state.ui.newTaskDate = '';
                    } else if (type === 'today') {
                        datePicker.value = dateFns.format(new Date(), 'yyyy-MM-dd');
                    } else if (type === 'tomorrow') {
                        datePicker.value = dateFns.format(dateFns.addDays(new Date(), 1), 'yyyy-MM-dd');
                    }
                });
            });

            // Initialize date picker with empty if not set
            if (!datePicker.value && !document.querySelector('#task-date-btns .date-btn[data-date="none"]').classList.contains('bg-[#ff6b35]/10')) {
                datePicker.value = '';
            }
            
            datePicker.addEventListener('change', () => {
                resetDateBtns(); // Custom date selected
            });

            // Handle Save Button
            const saveBtn = document.getElementById('btn-save-new-item');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    window.saveNewItem();
                });
            }
        }

        window.saveNewItem = () => {
            const input = document.getElementById('new-task-input');
            const title = input.value;
            if (!title.trim()) return;

            const source = document.getElementById('new-task-source')?.value || '';
            
            let type = 'task';

            let difficulty = 'medium';
            const activeDiffBtn = document.querySelector('#task-difficulty-btns .diff-btn[data-active="true"]');
            if (activeDiffBtn) difficulty = activeDiffBtn.dataset.diff;

            let date = document.getElementById('new-task-date-picker')?.value;
            if (date === undefined || date === null || date === '') {
                date = state.ui.newTaskDate || '';
            }
            
            const notes = document.getElementById('new-task-notes')?.value || '';

            window.addTask(title, source, difficulty, date, type, '', '', notes);
            
            input.value = '';
            input.placeholder = 'Add a new task... (Enter to save)';
            if (document.getElementById('new-task-source')) document.getElementById('new-task-source').value = '';
            if (document.getElementById('new-task-notes')) document.getElementById('new-task-notes').value = '';
            
            const optionsPanel = document.getElementById('new-task-options');
            if(optionsPanel) {
                optionsPanel.classList.add('hidden');
                optionsPanel.classList.remove('flex');
            }
        };

        window.deleteSourceTag = (sourceName) => {
            if (confirm(`Are you sure you want to remove the tag "${sourceName}" from all tasks and meetings?`)) {
                state.tasks.forEach(t => {
                    if (t.source === sourceName) {
                        t.source = '';
                    }
                });
                window.renderTasks();
                window.updateCalendarEvents();
                window.saveData();
                renderSourceChips();
            }
        };

        function renderSourceChips() {
            const taskChipsContainer = document.getElementById('task-source-chips');
            const meetingChipsContainer = document.getElementById('meeting-source-chips');
            
            // Get unique sources from existing tasks and merge with persisted sources
            const taskSources = [...new Set(state.tasks.map(t => t.source).filter(s => s && s.trim() !== ''))];
            
            // Update state.sources to include any new sources found in tasks
            taskSources.forEach(s => {
                if (!state.sources.includes(s)) state.sources.push(s);
            });
            
            // Filter state.sources to only include sources that actually exist in tasks
            state.sources = state.sources.filter(s => taskSources.includes(s));

            const chipHTML = (s, targetId) => `
                <div class="source-chip flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition-colors border border-slate-800" data-source="${s}">
                    <div class="chip-drag-handle cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400">
                        <i data-lucide="grip-vertical" class="w-2.5 h-2.5"></i>
                    </div>
                    <button type="button" 
                        onclick="document.getElementById('${targetId}').value = '${s}'" 
                        oncontextmenu="event.preventDefault(); window.deleteSourceTag('${s}')"
                        title="Right-click to delete"
                        class="flex-1 text-left">
                        ${s}
                    </button>
                </div>
            `;

            if (taskChipsContainer) {
                taskChipsContainer.innerHTML = state.sources.map(s => chipHTML(s, 'new-task-source')).join('');
                if (window.Sortable) {
                    if (taskChipsContainer._sortable) taskChipsContainer._sortable.destroy();
                    taskChipsContainer._sortable = new Sortable(taskChipsContainer, {
                        animation: 150,
                        handle: '.chip-drag-handle',
                        ghostClass: 'opacity-50',
                        onEnd: function() {
                            state.sources = Array.from(taskChipsContainer.children).map(el => el.dataset.source);
                            saveData();
                        }
                    });
                }
            }

            if (meetingChipsContainer) {
                meetingChipsContainer.innerHTML = state.sources.map(s => chipHTML(s, 'meeting-source')).join('');
                if (window.Sortable) {
                    if (meetingChipsContainer._sortable) meetingChipsContainer._sortable.destroy();
                    meetingChipsContainer._sortable = new Sortable(meetingChipsContainer, {
                        animation: 150,
                        handle: '.chip-drag-handle',
                        ghostClass: 'opacity-50',
                        onEnd: function() {
                            state.sources = Array.from(meetingChipsContainer.children).map(el => el.dataset.source);
                            saveData();
                        }
                    });
                }
            }
            safeCreateIcons();
        }

        window.openTaskModal = (id) => {
            const task = state.tasks.find(t => t.id === id);
            if (!task) return;

            const modal = document.getElementById('task-modal');
            const content = document.getElementById('task-modal-content');
            
            document.getElementById('task-modal-id').value = task.id;
            document.getElementById('task-modal-title').value = task.title || '';
            document.getElementById('task-modal-notes').value = task.notes || '';
            document.getElementById('task-modal-source').value = task.source || '';
            document.getElementById('task-modal-date').value = task.date || '';
            document.getElementById('task-modal-completed').checked = task.completed || false;
            document.getElementById('task-modal-bookmarked').checked = task.isBookmarked || false;

            // Set difficulty buttons
            const btns = document.querySelectorAll('.modal-diff-btn');
            btns.forEach(b => {
                const diff = b.dataset.diff;
                if (diff === (task.difficulty || 'medium')) {
                    b.className = `modal-diff-btn flex-1 py-1.5 rounded-md text-xs font-bold border border-[#ff6b35] bg-[#ff6b35]/10 text-[#ff6b35] transition-colors`;
                    b.dataset.active = 'true';
                } else {
                    b.className = `modal-diff-btn flex-1 py-1.5 rounded-md text-xs font-bold border border-slate-800 text-slate-400 hover:text-white transition-colors`;
                    b.dataset.active = 'false';
                }
            });

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                content.classList.remove('scale-95');
            }, 10);
            safeCreateIcons();
        };

        window.closeTaskModal = () => {
            const modal = document.getElementById('task-modal');
            const content = document.getElementById('task-modal-content');
            modal.classList.add('opacity-0');
            content.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        };

        window.saveTaskModal = () => {
            const id = document.getElementById('task-modal-id').value;
            const task = state.tasks.find(t => t.id === id);
            if (!task) return;

            const wasCompleted = task.completed;
            const isCompleted = document.getElementById('task-modal-completed').checked;

            task.title = document.getElementById('task-modal-title').value;
            task.notes = document.getElementById('task-modal-notes').value;
            task.source = document.getElementById('task-modal-source').value;
            task.date = document.getElementById('task-modal-date').value;
            task.isBookmarked = document.getElementById('task-modal-bookmarked').checked;
            
            const activeBtn = document.querySelector('.modal-diff-btn[data-active="true"]');
            if (activeBtn) {
                task.difficulty = activeBtn.dataset.diff;
            }

            // Handle completion XP logic if changed
            if (wasCompleted !== isCompleted) {
                task.completed = isCompleted;
                let xpReward = 10;
                if (task.difficulty === 'quick') xpReward = 5;
                else if (task.difficulty === 'medium') xpReward = 20;
                else if (task.difficulty === 'hard') xpReward = 30;
                
                if (isCompleted) {
                    updateStats(xpReward, 'MIND', 0);
                } else {
                    updateStats(-xpReward, 'MIND', 0);
                }
            }

            renderAll();
            saveData();
            closeTaskModal();
        };

        window.deleteTaskModal = () => {
            const id = document.getElementById('task-modal-id').value;
            if (id && confirm('Delete this task?')) {
                state.tasks = state.tasks.filter(t => t.id !== id);
                renderAll();
                saveData();
                closeTaskModal();
            }
        };

        // Add event listeners for modal difficulty buttons
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.modal-diff-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.modal-diff-btn').forEach(b => {
                        b.className = 'modal-diff-btn flex-1 py-1.5 rounded-md text-xs font-bold border border-slate-800 text-slate-400 hover:text-white transition-colors';
                        b.dataset.active = 'false';
                    });
                    e.target.className = 'modal-diff-btn flex-1 py-1.5 rounded-md text-xs font-bold border border-[#ff6b35] bg-[#ff6b35]/10 text-[#ff6b35] transition-colors';
                    e.target.dataset.active = 'true';
                });
            });
        });

        window.openMeetingModal = (info = null, existingMeeting = null) => {
            const modal = document.getElementById('meeting-modal');
            const content = document.getElementById('meeting-modal-content');
            
            // Reset fields
            document.getElementById('meeting-id').value = '';
            document.getElementById('meeting-title').value = '';
            document.getElementById('meeting-source').value = '';
            document.getElementById('meeting-notes').value = '';
            document.getElementById('meeting-date').value = dateFns.format(new Date(), 'yyyy-MM-dd');
            document.getElementById('meeting-end-date').value = '';
            document.getElementById('meeting-start').value = '';
            document.getElementById('meeting-end').value = '';
            document.getElementById('meeting-allday').checked = false;
            document.getElementById('meeting-time-container').classList.remove('hidden');
            document.getElementById('meeting-repeat').value = 'none';
            document.getElementById('meeting-repeat-until').value = '';
            document.getElementById('meeting-repeat-until-container').classList.add('hidden');
            
            document.getElementById('btn-delete-meeting').classList.add('hidden');
            document.getElementById('meeting-modal-title').innerHTML = '<i data-lucide="calendar-plus" class="w-5 h-5 text-[#a855f7]"></i> New Meeting';

            if (existingMeeting) {
                document.getElementById('meeting-id').value = existingMeeting.id;
                document.getElementById('meeting-title').value = existingMeeting.title;
                document.getElementById('meeting-source').value = existingMeeting.source || '';
                document.getElementById('meeting-notes').value = existingMeeting.notes || '';
                document.getElementById('meeting-date').value = existingMeeting.date;
                document.getElementById('meeting-end-date').value = existingMeeting.endDate || '';
                document.getElementById('meeting-start').value = existingMeeting.startTime || '';
                document.getElementById('meeting-end').value = existingMeeting.endTime || '';
                document.getElementById('meeting-allday').checked = !!existingMeeting.allDay;
                document.getElementById('meeting-repeat').value = existingMeeting.recurrence || 'none';
                document.getElementById('meeting-repeat-until').value = existingMeeting.recurrenceUntil || '';
                if (existingMeeting.recurrence && existingMeeting.recurrence !== 'none') {
                    document.getElementById('meeting-repeat-until-container').classList.remove('hidden');
                }
                if (existingMeeting.allDay) {
                    document.getElementById('meeting-time-container').classList.add('hidden');
                }
                document.getElementById('btn-delete-meeting').classList.remove('hidden');
                document.getElementById('meeting-modal-title').innerHTML = '<i data-lucide="calendar-edit" class="w-5 h-5 text-[#a855f7]"></i> Edit Meeting';
            } else if (info) {
                // From dateClick or select
                if (info.dateStr) {
                    const hasTime = info.dateStr.includes('T');
                    if (hasTime) {
                        document.getElementById('meeting-date').value = info.dateStr.split('T')[0];
                        document.getElementById('meeting-start').value = info.dateStr.split('T')[1].substring(0, 5);
                        // default end time to +1 hour
                        const endDate = dateFns.addHours(info.date, 1);
                        document.getElementById('meeting-end').value = dateFns.format(endDate, 'HH:mm');
                    } else {
                        document.getElementById('meeting-date').value = info.dateStr;
                        if (info.endStr && info.endStr !== info.dateStr) {
                            // FullCalendar select gives end date as exclusive, so subtract 1 day for inclusive UI
                            const endDate = new Date(info.endStr);
                            endDate.setDate(endDate.getDate() - 1);
                            document.getElementById('meeting-end-date').value = dateFns.format(endDate, 'yyyy-MM-dd');
                        }
                    }
                }
            }

            modal.classList.remove('hidden');
            // trigger reflow
            void modal.offsetWidth;
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            safeCreateIcons();
            renderSourceChips();
        };

        window.closeMeetingModal = () => {
            const modal = document.getElementById('meeting-modal');
            const content = document.getElementById('meeting-modal-content');
            modal.classList.add('opacity-0');
            content.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        };

        window.saveMeeting = () => {
            const id = document.getElementById('meeting-id').value;
            const title = document.getElementById('meeting-title').value;
            const source = document.getElementById('meeting-source').value;
            const notes = document.getElementById('meeting-notes').value;
            const date = document.getElementById('meeting-date').value;
            const endDate = document.getElementById('meeting-end-date').value;
            const allDay = document.getElementById('meeting-allday').checked;
            const startTime = allDay ? '' : document.getElementById('meeting-start').value;
            const endTime = allDay ? '' : document.getElementById('meeting-end').value;
            const recurrence = document.getElementById('meeting-repeat').value;
            const recurrenceUntil = document.getElementById('meeting-repeat-until').value;

            if (!title.trim()) {
                alert('Please enter a meeting title');
                return;
            }

            if (id) {
                // Update existing
                const meeting = state.tasks.find(t => t.id === id);
                if (meeting) {
                    meeting.title = title;
                    meeting.source = source;
                    meeting.notes = notes;
                    meeting.date = date;
                    meeting.endDate = endDate;
                    meeting.allDay = allDay;
                    meeting.startTime = startTime;
                    meeting.endTime = endTime;
                    meeting.recurrence = recurrence;
                    meeting.recurrenceUntil = recurrenceUntil;
                }
            } else {
                // Create new
                window.addTask(title, source, 'medium', date, 'meeting', startTime, endTime, notes, endDate, allDay, recurrence, recurrenceUntil);
            }

            window.renderTasks();
            window.updateCalendarEvents();
            window.saveData();
            closeMeetingModal();
        };

        window.deleteMeeting = () => {
            const id = document.getElementById('meeting-id').value;
            if (id && confirm('Delete this meeting?')) {
                state.tasks = state.tasks.filter(t => t.id !== id);
                window.renderTasks();
                window.updateCalendarEvents();
                window.saveData();
                closeMeetingModal();
            }
        };

        document.addEventListener('DOMContentLoaded', () => {
            safeCreateIcons();
            initCalendar();
            initNewTaskOptions();
            
            // Meeting modal all-day toggle
            document.getElementById('meeting-allday')?.addEventListener('change', (e) => {
                const timeContainer = document.getElementById('meeting-time-container');
                if (e.target.checked) {
                    timeContainer.classList.add('hidden');
                } else {
                    timeContainer.classList.remove('hidden');
                }
            });
            try { if (typeof firebase !== 'undefined') { app = firebase.initializeApp(firebaseConfig); auth = firebase.auth(); db = firebase.firestore(); } else { isOfflineMode = true; } } catch (e) { isOfflineMode = true; }

            window.addEventListener('resize', () => {
                if (calendarInstance && state.ui.currentTab === 'tasks') {
                    calendarInstance.render();
                }
            });

            // Close expanded task when clicking outside
            document.addEventListener('click', (e) => {
                if (state.ui.expandedTaskId) {
                    // If clicking on any task item, let the task's own click handlers deal with it
                    if (e.target.closest('.task-item')) return;

                    const expandedEl = document.getElementById(`task-el-${state.ui.expandedTaskId}`);
                    // Check if click was outside the expanded task element
                    if (expandedEl && !expandedEl.contains(e.target)) {
                        // Also check if we're not clicking on a modal or other UI that should be ignored
                        const isModal = e.target.closest('#meeting-modal, #habit-modal, .fc-popover, .modal-content');
                        if (!isModal) {
                            state.ui.expandedTaskId = null;
                            renderTasks();
                            saveData();
                        }
                    }
                }
            });

            const handleEnterToSave = (e) => {
                if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
                    e.preventDefault();
                    window.saveNewItem();
                }
            };

            const taskInput = document.getElementById('new-task-input');
            taskInput?.addEventListener('keydown', handleEnterToSave);
            
            const sourceInput = document.getElementById('new-task-source');
            sourceInput?.addEventListener('keydown', handleEnterToSave);

            const datePickerInput = document.getElementById('new-task-date-picker');
            datePickerInput?.addEventListener('keydown', handleEnterToSave);

            taskInput?.addEventListener('blur', (e) => {
                if (!e.target.value.trim()) {
                    state.ui.newTaskDate = null;
                    e.target.placeholder = 'Add a new task... (Enter to save)';
                }
            });

            document.getElementById('btn-save-habit')?.addEventListener('click', () => {
                const title = document.getElementById('modal-habit-title').value;
                if (!title.trim()) return;
                state.habits.push({ id: crypto.randomUUID(), title, type: state.ui.modalType, stat: state.ui.selectedStat, xpReward: 10, statReward: 1, completedDates: [], streak: 0, createdAt: new Date().toISOString() });
                saveData(); renderAll(); window.closeModal();
            });

            document.getElementById('btn-add-gratitude')?.addEventListener('click', addGratitude);
            document.getElementById('gratitude-input')?.addEventListener('keydown', (e) => {
                // Change to Shift+Enter to submit
                if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault();
                    addGratitude();
                }
            });

            document.getElementById('btn-logout')?.addEventListener('click', () => { localStorage.removeItem('offline_mode_active'); if (isOfflineMode) { state.user = null; isOfflineMode = false; showScreen('login'); window.location.reload(); } else { auth.signOut(); } });
            document.getElementById('btn-offline-mode')?.addEventListener('click', () => { isOfflineMode = true; localStorage.setItem('offline_mode_active', 'true'); state.user = { uid: "offline_user", email: "offline@hero.com", displayName: "Offline Hero" }; document.getElementById('user-display-name').innerText = "Offline Hero"; loadUserData("offline_user"); showScreen('dashboard'); });
            
            const authForm = document.getElementById('auth-form');
            if(authForm) {
                authForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('input-email').value;
                    const password = document.getElementById('input-password').value;
                    const username = document.getElementById('input-username').value;
                    const isRegistering = !document.getElementById('username-field').classList.contains('hidden');
                    try { 
                        if (auth && auth.setPersistence) await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                        if (isRegistering) { const cred = await auth.createUserWithEmailAndPassword(email, password); if (cred.user) await cred.user.updateProfile({ displayName: username }); } else { await auth.signInWithEmailAndPassword(email, password); } 
                    } catch (err) { alert(err.message); }
                });
            }
            document.getElementById('btn-toggle-auth-mode')?.addEventListener('click', () => { const userField = document.getElementById('username-field'); const isHidden = userField.classList.contains('hidden'); userField.classList.toggle('hidden'); document.getElementById('btn-submit-auth').innerText = isHidden ? "Start Journey" : "Create Account"; document.getElementById('btn-toggle-auth-mode').innerText = isHidden ? "Create new account" : "Back to Login"; });

            if (localStorage.getItem('offline_mode_active') === 'true') {
                isOfflineMode = true;
                state.user = { uid: "offline_user", email: "offline@hero.com", displayName: "Offline Hero" }; 
                document.getElementById('user-display-name').innerText = "Offline Hero"; 
                loadUserData("offline_user"); 
                showScreen('dashboard'); 
            } else if (!isOfflineMode && auth) { 
                auth.onAuthStateChanged(async (user) => { 
                    if (user) { 
                        state.user = user; 
                        document.getElementById('user-display-name').innerText = user.displayName || "Hero"; 
                        await loadUserData(user.uid); 
                        showScreen('dashboard'); 
                    } else { 
                        state.user = null; 
                        showScreen('login'); 
                    } 
                }, (error) => {
                    console.error("Auth state error:", error);
                }); 
            } else {
                // No auth and not offline mode
                setTimeout(() => { 
                    document.getElementById('loading-overlay').classList.add('hidden'); 
                    showScreen('login'); 
                }, 1000);
            }
            
            // Ensure UI is populated with any preemptively loaded data
            renderAll();
        });

        let unsubscribeUser = null;

        function generateMockData() {
            if (!window.dateFns) return;
            const today = new Date();
            const habits = [
                { id: crypto.randomUUID(), title: 'Read 30 mins', type: 'good', completedDates: [] },
                { id: crypto.randomUUID(), title: 'Workout', type: 'good', completedDates: [] },
                { id: crypto.randomUUID(), title: 'Junk Food', type: 'bad', completedDates: [] }
            ];
            const tasks = [];
            const sources = ['Project Alpha', 'Learning', 'Admin', 'Health', 'Design'];

            for (let i = 0; i < 30; i++) {
                const d = dateFns.subDays(today, i);
                const dateStr = dateFns.format(d, 'yyyy-MM-dd');

                if (Math.random() > 0.3) habits[0].completedDates.push(dateStr);
                if (Math.random() > 0.5) habits[1].completedDates.push(dateStr);
                if (Math.random() > 0.8) habits[2].completedDates.push(dateStr);

                const numTasks = Math.floor(Math.random() * 4);
                for (let j = 0; j < numTasks; j++) {
                    const isMeeting = Math.random() > 0.8;
                    const diffs = ['easy', 'medium', 'hard'];
                    tasks.push({
                        id: crypto.randomUUID(),
                        title: isMeeting ? `Sync with team ${j}` : `Complete task ${j}`,
                        type: isMeeting ? 'meeting' : 'task',
                        source: sources[Math.floor(Math.random() * sources.length)],
                        difficulty: diffs[Math.floor(Math.random() * diffs.length)],
                        date: dateStr,
                        completed: true,
                        createdAt: new Date(d).toISOString(),
                        order: j
                    });
                }
            }
            state.habits = habits;
            state.tasks = tasks;
            state.stats.currentXp = 450;
            state.stats.level = 5;
            saveData();
        }

        async function loadUserData(uid) {
            let localData = null;
            try { localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)); } catch (e) {}
            
            if (isOfflineMode && !localData) {
                generateMockData();
                renderAll();
                return;
            }

            if (!isOfflineMode && db) {
                return new Promise((resolve) => {
                    let isFirstLoad = true;
                    if (unsubscribeUser) unsubscribeUser();
                    
                    unsubscribeUser = db.collection('users').doc(uid).onSnapshot((docSnap) => {
                        let data = docSnap.exists ? docSnap.data() : {};
                        
                        // If local data is newer (e.g. user closed tab before Firestore save completed), use it and sync it
                        if (localData && localData.lastModified && (!data.lastModified || localData.lastModified > data.lastModified)) {
                            data = localData;
                            db.collection('users').doc(uid).set(data, { merge: true });
                        }
                        
                        const newData = {
                            habits: (data.habits || []).map(h => ({...h, type: h.type || 'good'})),
                            gratitudeLogs: data.gratitudeLogs || [],
                            tasks: data.tasks || [],
                            sources: data.sources || [],
                            stats: data.stats || INITIAL_STATS,
                            lastModified: data.lastModified || Date.now()
                        };
                        
                        updateLastModifiedUI(newData.lastModified);
                        
                        const currentState = {
                            habits: state.habits,
                            gratitudeLogs: state.gratitudeLogs,
                            tasks: state.tasks,
                            sources: state.sources,
                            stats: state.stats,
                            lastModified: state.lastModified
                        };
                            
                        state.habits = newData.habits; 
                        state.gratitudeLogs = newData.gratitudeLogs; 
                        state.tasks = newData.tasks; 
                        state.sources = newData.sources;
                        state.stats = newData.stats; 
                        state.lastModified = newData.lastModified;
                        
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
                        
                        renderAll();
                        if (calendarInstance && state.ui.currentTab === 'tasks') {
                            setTimeout(() => calendarInstance.render(), 100);
                        }
                            
                            if (!docSnap.exists && !localData) { 
                                db.collection('users').doc(uid).set({ habits: state.habits, gratitudeLogs: state.gratitudeLogs, tasks: state.tasks, sources: state.sources, stats: state.stats, lastModified: state.lastModified }, { merge: true }); 
                            }
                        
                        if (isFirstLoad) {
                            isFirstLoad = false;
                            resolve();
                        }
                    }, (error) => {
                        console.error("Firestore sync error:", error);
                        if(localData) { 
                            state.habits = localData.habits || []; 
                            state.gratitudeLogs = localData.gratitudeLogs || []; 
                            state.tasks = localData.tasks || []; 
                            state.sources = localData.sources || [];
                            state.stats = localData.stats || INITIAL_STATS; 
                            renderAll();
                        }
                        if (isFirstLoad) {
                            isFirstLoad = false;
                            resolve();
                        }
                    });
                });
            } else { 
                if (localData) {
                    state.habits = localData.habits || []; 
                    state.gratitudeLogs = localData.gratitudeLogs || []; 
                    state.tasks = localData.tasks || []; 
                    state.sources = localData.sources || [];
                    state.stats = localData.stats || INITIAL_STATS; 
                    state.lastModified = localData.lastModified || Date.now();
                } else {
                    state.lastModified = Date.now();
                }
                updateLastModifiedUI(state.lastModified);
                renderAll();
                if (calendarInstance && state.ui.currentTab === 'tasks') {
                    setTimeout(() => calendarInstance.render(), 100);
                }
            }
        }
        let saveTimeout = null;
        let pendingSaveData = null;

        window.addEventListener('beforeunload', () => {
            if (pendingSaveData && !isOfflineMode && state.user && state.user.uid !== 'offline_user' && db) {
                db.collection('users').doc(state.user.uid).set(pendingSaveData, { merge: true });
            }
        });

        async function saveData() {
            state.lastModified = Date.now();
            const dataToSave = { habits: state.habits, gratitudeLogs: state.gratitudeLogs, tasks: state.tasks, sources: state.sources, stats: state.stats, lastModified: state.lastModified };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
            updateLastModifiedUI(state.lastModified);
            
            pendingSaveData = dataToSave;
            const indicator = document.getElementById('saving-indicator');
            if (indicator) {
                indicator.classList.remove('hidden');
                indicator.classList.add('flex');
            }
            
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            
            saveTimeout = setTimeout(async () => {
                if (!pendingSaveData) return;
                const data = pendingSaveData;
                pendingSaveData = null;
                saveTimeout = null;
                
                try { 
                    if (!isOfflineMode && state.user && state.user.uid !== 'offline_user' && db) {
                        await db.collection('users').doc(state.user.uid).set(data, { merge: true }); 
                    }
                } catch (e) { 
                    console.error("Save error:", e); 
                }
                finally { 
                    if (indicator) {
                        indicator.classList.add('hidden');
                        indicator.classList.remove('flex');
                    }
                }
            }, 500); // Debounce for 0.5 seconds
        }

        function updateLastModifiedUI(timestamp) {
            if (!timestamp) return;
            const indicator = document.getElementById('last-modified-indicator');
            const textEl = document.getElementById('last-modified-text');
            if (indicator && textEl) {
                const date = new Date(timestamp);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                textEl.innerText = `Last saved: ${timeStr}`;
                indicator.classList.remove('hidden');
                indicator.classList.add('flex');
            }
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            const bgColor = type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400';
            const icon = type === 'success' ? 'check-circle' : 'alert-circle';
            
            toast.className = `flex items-center gap-2 px-4 py-3 rounded-xl border ${bgColor} backdrop-blur-md shadow-lg transform transition-all duration-300 translate-y-4 opacity-0`;
            toast.innerHTML = `
                <i data-lucide="${icon}" class="w-4 h-4"></i>
                <span class="text-sm font-bold">${message}</span>
            `;
            
            container.appendChild(toast);
            if (window.lucide) window.lucide.createIcons({ root: toast });

            // Animate in
            requestAnimationFrame(() => {
                toast.classList.remove('translate-y-4', 'opacity-0');
            });

            // Remove after 3 seconds
            setTimeout(() => {
                toast.classList.add('translate-y-4', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    