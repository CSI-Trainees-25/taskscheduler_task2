document.addEventListener('DOMContentLoaded', function() {
 
    const titleInput = document.getElementById('titleInput');
    const durationInput = document.getElementById('durationInput');
    const dateInput = document.getElementById('dateInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const addBtn = document.getElementById('addBtn');
    const listBox = document.getElementById('listBox');
    const startAllBtn = document.getElementById('startAll');
    const timerBox = document.getElementById('timerBox');
    const taskCount = document.getElementById('taskCount');
    const totalCount = document.getElementById('totalCount');
    const doingCount = document.getElementById('doingCount');
    const doneCount = document.getElementById('doneCount');
    
    const mainPage = document.getElementById('mainPage');
    const summaryPage = document.getElementById('summaryPage');
    const backBtn = document.getElementById('backToApp');
    const newBtn = document.getElementById('newSession');
    const totalTime = document.getElementById('totalTime');
    const actualTime = document.getElementById('actualTime');
    const efficiency = document.getElementById('efficiency');
    const taskListEl = document.getElementById('taskDetailsList');

 
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentTaskIndex = -1;
    let timer = null;
    let timeLeft = 0;

   
    function setup() {
        drawTasks();
        updateStats();
        setMinDate();
        backBtn.addEventListener('click', showMain);
        newBtn.addEventListener('click', newSession);
    }

    function setMinDate() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        dateInput.min = `${y}-${m}-${d}T${h}:${min}`;
    }

  
    addBtn.addEventListener('click', function() {
        const title = titleInput.value.trim();
        const mins = parseInt(durationInput.value);
        const date = dateInput.value;
        const priority = prioritySelect.value;

        if (!title || isNaN(mins) || mins <= 0 || !date) {
            alert('Please fill all fields');
            return;
        }

        if (new Date(date) < new Date()) {
            alert('Cannot select past date');
            return;
        }

        const task = {
            id: Date.now(),
            title,
            mins,
            date,
            priority,
            status: 'pending',
            start: null,
            end: null,
            spent: null
        };

        tasks.push(task);
        save();
        drawTasks();
        updateStats();

        titleInput.value = '';
        durationInput.value = '';
        dateInput.value = '';
        prioritySelect.value = 'medium';
    });

   
    function drawTasks() {
        listBox.innerHTML = '';

        if (tasks.length === 0) {
            listBox.innerHTML = `
                <div class="no-task">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No tasks yet</p>
                </div>`;
            taskCount.textContent = '0 tasks';
            return;
        }

        taskCount.textContent = `${tasks.length} tasks`;

        tasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-row';
            taskEl.draggable = true;
            taskEl.dataset.id = task.id;

            const taskDate = new Date(task.date);
            const dateStr = taskDate.toLocaleDateString();
            const timeStr = taskDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            taskEl.innerHTML = `
                <div class="task-head">
                    <div class="task-name">${task.title}</div>
                    <span class="status ${task.status}">${task.status}</span>
                </div>
                <div class="task-info">
                    <div><i class="fas fa-clock"></i> ${task.mins} mins</div>
                    <div><span class="prio-${task.priority}"></span> ${task.priority}</div>
                    <div><i class="fas fa-calendar"></i> ${dateStr}</div>
                    <div><i class="fas fa-hourglass-half"></i> ${timeStr}</div>
                </div>
                ${task.spent ? `<div class="task-info"><i class="fas fa-stopwatch"></i> Took: ${formatTime(task.spent)}</div>` : ''}
                <div class="task-btns">
                    <button class="btn start-btn start-task" data-id="${task.id}"><i class="fas fa-play"></i>Start</button>
                    <button class="btn done-btn finish-task" data-id="${task.id}"><i class="fas fa-check"></i>Finish</button>
                    <button class="btn skip-btn skip-task" data-id="${task.id}"><i class="fas fa-forward"></i>Skip</button>
                    <button class="btn delete-btn delete-task" data-id="${task.id}"><i class="fas fa-trash"></i></button>
                </div>`;

            listBox.appendChild(taskEl);
        });

      
        document.querySelectorAll('.start-task').forEach(btn => {
            btn.addEventListener('click', function() {
                startTask(parseInt(this.dataset.id));
            });
        });

        document.querySelectorAll('.finish-task').forEach(btn => {
            btn.addEventListener('click', function() {
                finishTask(parseInt(this.dataset.id));
            });
        });

        document.querySelectorAll('.skip-task').forEach(btn => {
            btn.addEventListener('click', function() {
                skipTask(parseInt(this.dataset.id));
            });
        });

        document.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteTask(parseInt(this.dataset.id));
            });
        });

        setupDrag();
    }

    // Drag and drop
    function setupDrag() {
        const taskRows = document.querySelectorAll('.task-row');
        let draggedEl = null;

        taskRows.forEach(row => {
            row.addEventListener('dragstart', function() {
                draggedEl = this;
                setTimeout(() => this.classList.add('dragging'), 0);
            });

            row.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                draggedEl = null;
                const newOrder = [];
                document.querySelectorAll('.task-row').forEach(r => {
                    const id = parseInt(r.dataset.id);
                    const task = tasks.find(t => t.id === id);
                    if (task) newOrder.push(task);
                });
                tasks = newOrder;
                save();
            });
        });

        listBox.addEventListener('dragover', e => {
            e.preventDefault();
            const afterEl = getDragAfterElement(listBox, e.clientY);
            const draggingEl = document.querySelector('.dragging');
            if (!afterEl) {
                listBox.appendChild(draggingEl);
            } else {
                listBox.insertBefore(draggingEl, afterEl);
            }
        });
    }

    function getDragAfterElement(container, y) {
        const elements = [...container.querySelectorAll('.task-row:not(.dragging)')];
        return elements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: -Infinity }).element;
    }

    // Task actions
    function startTask(id) {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        const task = tasks[taskIndex];
        const now = new Date();
        if (now < new Date(task.date)) {
            alert("Task scheduled for later");
            return;
        }

        if (currentTaskIndex !== -1 && tasks[currentTaskIndex].status === 'doing') {
            tasks[currentTaskIndex].status = 'pending';
        }

        task.status = 'doing';
        task.start = new Date().toISOString();
        currentTaskIndex = taskIndex;
        timeLeft = task.mins * 60;

        updateStats();
        drawTasks();
        startTimer();
    }

    function finishTask(id) {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        clearInterval(timer);
        const task = tasks[taskIndex];
        task.status = 'done';
        task.end = new Date().toISOString();
        
        if (task.start) {
            task.spent = Math.floor((new Date(task.end) - new Date(task.start)) / 1000);
        }

        if (taskIndex === currentTaskIndex) {
            currentTaskIndex = -1;
            timerBox.innerHTML = '<i class="fas fa-check-circle"></i> Done!';
        }

        updateStats();
        save();
        drawTasks();

        if (allTasksDone()) {
            setTimeout(() => {
                showSummary();
            }, 1000);
        }
    }

    function skipTask(id) {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        clearInterval(timer);
        const task = tasks[taskIndex];
        task.status = 'pending';
        task.start = null;

        if (taskIndex === currentTaskIndex) {
            currentTaskIndex = -1;
            timerBox.innerHTML = '<i class="fas fa-forward"></i> Skipped!';
        }

        updateStats();
        save();
        drawTasks();
    }

    function deleteTask(id) {
        if (!confirm('Delete this task?')) return;
        
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        if (taskIndex === currentTaskIndex) {
            clearInterval(timer);
            currentTaskIndex = -1;
            timerBox.innerHTML = '<i class="fas fa-trash"></i> Deleted!';
        }

        tasks.splice(taskIndex, 1);
        updateStats();
        save();
        drawTasks();
    }

    // Timer
    function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timer);
                if (currentTaskIndex !== -1) {
                    finishTask(tasks[currentTaskIndex].id);
                }
                return;
            }
            const min = Math.floor(timeLeft / 60);
            const sec = timeLeft % 60;
            timerBox.innerHTML = `<i class="fas fa-clock"></i> ${min}:${sec.toString().padStart(2, '0')}`;
            timeLeft--;
        }, 1000);
    }

    // Summary page
    function allTasksDone() {
        return tasks.length > 0 && tasks.every(task => task.status === 'done');
    }

    function showSummary() {
        calcSummary();
        mainPage.style.display = 'none';
        summaryPage.style.display = 'block';
    }

    function showMain() {
        summaryPage.style.display = 'none';
        mainPage.style.display = 'block';
    }

    function newSession() {
        tasks = [];
        save();
        drawTasks();
        updateStats();
        showMain();
    }

    function calcSummary() {
        const doneTasks = tasks.filter(task => task.status === 'done');
        
        const plannedMins = doneTasks.reduce((sum, task) => sum + task.mins, 0);
        const actualSecs = doneTasks.reduce((sum, task) => sum + (task.spent || 0), 0);
        const actualMins = Math.round(actualSecs / 60);
        
        let eff = 0;
        if (actualMins > 0) {
            eff = Math.round((plannedMins / actualMins) * 100);
        }

        totalTime.textContent = `${plannedMins} min`;
        actualTime.textContent = `${actualMins} min`;
        efficiency.textContent = `${eff}%`;

        showTaskSummary(doneTasks);
    }

    function showTaskSummary(doneTasks) {
        taskListEl.innerHTML = doneTasks.map(task => `
            <div class="task-summary">
                <div class="task-summary-header">
                    <div class="task-summary-name">${task.title}</div>
                    <span class="priority ${task.priority}">${task.priority}</span>
                </div>
                <div class="task-summary-info">
                    <div><i class="fas fa-clock"></i> Planned: ${task.mins} min</div>
                    <div><i class="fas fa-stopwatch"></i> Actual: ${task.spent ? formatTime(task.spent) : 'N/A'}</div>
                    <div><i class="fas fa-calendar"></i> ${new Date(task.date).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    }

    // Utilities
    function updateStats() {
        totalCount.textContent = tasks.length;
        doingCount.textContent = tasks.filter(t => t.status === 'doing').length;
        doneCount.textContent = tasks.filter(t => t.status === 'done').length;
    }

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    function save() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Start all tasks
    startAllBtn.addEventListener('click', function() {
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        if (pendingTasks.length > 0) {
            startTask(pendingTasks[0].id);
        } else {
            alert('No pending tasks');
        }
    });

    // Initialize
    setup();
});