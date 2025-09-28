document.addEventListener('DOMContentLoaded', function() {
  
    const titleInput = document.getElementById('titleInput');
    const durationInput = document.getElementById('durationInput');
    const dateInput = document.getElementById('dateInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const addBtn = document.getElementById('addBtn');
    const listBox = document.getElementById('listBox');
    const startAllBtn = document.getElementById('startAll');
    const endBtn = document.getElementById('endBtn');
    const finishBtn = document.getElementById('finishBtn');
    const skipBtn = document.getElementById('skipBtn');
    const timerBox = document.getElementById('timerBox');
    const summaryBox = document.getElementById('summaryBox');
    const summaryItems = document.getElementById('summaryItems');
    const backBtn = document.getElementById('backBtn');
    const breakNote = document.getElementById('breakNote');
    const taskCount = document.getElementById('taskCount');
    const totalCount = document.getElementById('totalCount');
    const doingCount = document.getElementById('doingCount');
    const doneCount = document.getElementById('doneCount');

  
    let taskList = JSON.parse(localStorage.getItem('taskList')) || [];
    let currentIndex = -1;
    let timer = null;
    let timeLeft = 0;
    let onBreak = false;
    let startTime = null;




    addBtn.addEventListener('click', function() {
        const title = titleInput.value.trim();
        const mins = parseInt(durationInput.value);
        const date = dateInput.value;
        const priority = prioritySelect.value;

        if (!title || isNaN(mins) || mins <= 0 || !date) {
            alert('Please fill all fields correctly');
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

        taskList.push(task);
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

        if (taskList.length === 0) {
            listBox.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No tasks yet. Add one above!</p>
                </div> `;
            taskCount.textContent = '0 tasks';
            return;
        }

        taskCount.textContent = `${taskList.length} tasks`;

        taskList.forEach(task => {
            const box = document.createElement('div');
            box.className = 'task-row';
            box.draggable = true;
            box.dataset.id = task.id;

            const d = new Date(task.date);
            const dateStr = d.toLocaleDateString();
            const timeStr = d.toLocaleTimeString();

            let statusClass = task.status === 'done' ? 'done' : 
                              task.status === 'doing' ? 'doing' : 'pending';

            let prioClass = task.priority === 'high' ? 'prio-high' :
                            task.priority === 'low' ? 'prio-low' : 'prio-med';

            box.innerHTML = `
                <div class="task-head">
                    <div class="task-name">${task.title}</div>
                    <span class="status ${statusClass}">${task.status}</span>
                </div>
                <div class="task-info">
                    <div><i class="fas fa-clock"></i> ${task.mins} mins</div>
                    <div><span class="${prioClass}"></span> ${task.priority}</div>
                    <div><i class="fas fa-calendar"></i> ${dateStr}</div>
                    <div><i class="fas fa-hourglass-half"></i> ${timeStr}</div>
                </div>
                ${task.spent ? `<div class="task-info"><i class="fas fa-stopwatch"></i> Took: ${formatTime(task.spent)}</div>` : ''}
                <div class="task-btns">
                    <button class="btn start" id="${task.id}"><i class="fas fa-play"></i></button>
                    <button class="btn done" id="${task.id}"><i class="fas fa-check"></i></button>
                    <button class="btn skip" id="${task.id}"><i class="fas fa-forward"></i></button>
                    <button class="btn delete" id="${task.id}"><i class="fas fa-trash"></i></button>
                </div> `;

            listBox.appendChild(box);
        });

      
        document.querySelectorAll('.start').forEach(b => b.click = () => startTask(+b.dataset.id));
        document.querySelectorAll('.done').forEach(b => b.click = () => finishTask(+b.dataset.id));
        document.querySelectorAll('.skip').forEach(b => b.click = () => skipTask(+b.dataset.id));
        document.querySelectorAll('.delete').forEach(b => b.click = () => removeTask(+b.dataset.id));

      
        dragSetup();
    }

  
    function dragSetup() {
        const rows = document.querySelectorAll('.task-row');
        let dragEl = null;

        rows.forEach(row => {
            row.addEventListener('dragstart', function() {
                dragEl = this;
                setTimeout(() => this.classList.add('dragging'), 0);
            });

            row.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                dragEl = null;
                const newOrder = [];
                document.querySelectorAll('.task-row').forEach(r => {
                    const id = +r.dataset.id;
                    const t = taskList.find(x => x.id === id);
                    if (t) newOrder.push(t);
                });
                taskList = newOrder;
                save();
            });
        });

        listBox.addEventListener('dragover', e => {
            e.preventDefault();
            const after = getAfter(listBox, e.clientY);
            const drag = document.querySelector('.dragging');
            if (!after) listBox.appendChild(drag);
            else listBox.insertBefore(drag, after);
        });
    }

    function getAfter(container, y) {
        const els = [...container.querySelectorAll('.task-row:not(.dragging)')];
        return els.reduce((closest, el) => {
            const box = el.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, el } : closest;
        }, { offset: -Infinity }).el;
    }

  
    function startTask(id) {
        const idx = taskList.findIndex(t => t.id === id);
        if (idx === -1) return;

        const task = taskList[idx];
        const now = new Date();
        if (now < new Date(task.date)) {
            alert("This task is scheduled later.");
            return;
        }

        if (currentIndex !== -1 && taskList[currentIndex].status === 'doing') {
            pauseTask();
        }

        task.status = 'doing';
        task.start = new Date().toISOString();
        currentIndex = idx;
        timeLeft = task.mins * 60;
        startTime = Date.now();

        updateStats();
        drawTasks();
        runTimer();
    }

  
    function finishTask(id) {
        const idx = taskList.findIndex(t => t.id === id);
        if (idx === -1) return;

        clearInterval(timer);
        const task = taskList[idx];
        task.status = 'done';
        task.end = new Date().toISOString();
        task.spent = Math.floor((Date.now() - startTime) / 1000);

        if (idx === currentIndex) {
            currentIndex = -1;
            timerBox.innerHTML = '<i class="fas fa-check-circle"></i> Task done!';
        }

        updateStats();
        save();
        drawTasks();
    }


    function skipTask(id) {
        const idx = taskList.findIndex(t => t.id === id);
        if (idx === -1) return;

        clearInterval(timer);
        const task = taskList[idx];
        task.status = 'pending';
        task.start = null;

        if (idx === currentIndex) {
            currentIndex = -1;
            timerBox.innerHTML = '<i class="fas fa-forward"></i> Task skipped!';
        }

        updateStats();
        save();
        drawTasks();
    }

  
    function removeTask(id) {
        if (!confirm('Delete this task?')) return;
        const idx = taskList.findIndex(t => t.id === id);
        if (idx === -1) return;

        if (idx === currentIndex) {
            clearInterval(timer);
            currentIndex = -1;
            timerBox.innerHTML = '<i class="fas fa-trash"></i> Task removed!';
        }

        taskList.splice(idx, 1);
        updateStats();
        save();
        drawTasks();
    }

    
    function runTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timer);
                finishTask(taskList[currentIndex].id);
                return;
            }
            const min = Math.floor(timeLeft / 60);
            const sec = timeLeft % 60;
            timerBox.innerHTML = `<i class="fas fa-clock"></i> ${min}:${sec.toString().padStart(2, '0')}`;
            timeLeft--;
        }, 1000);
    }

    function updateStats() {
        totalCount.textContent = taskList.length;
        doingCount.textContent = taskList.filter(t => t.status === 'doing').length;
        doneCount.textContent = taskList.filter(t => t.status === 'done').length;
    }

    function formatTime(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    function save() {
        localStorage.setItem('taskList', JSON.stringify(taskList));
    }

   
    setup();
});
