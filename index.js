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


   function setup() {
        drawTasks();
        updateStats();
        setMinDate();
        if (taskList.length > 0) {
            taskCount.textContent = `${taskList.length} tasks`;
        }
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

  
   