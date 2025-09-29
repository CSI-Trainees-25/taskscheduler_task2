document.addEventListener('DOMContentLoaded', function() {
  
    const taskname = document.getElementById('taskname');
    const tasktime = document.getElementById('tasktime');
    const taskdate = document.getElementById('taskdate');
    const taskprio = document.getElementById('taskprio');
    const addtask = document.getElementById('addtask');
    const taskslist = document.getElementById('taskslist');
    const startall = document.getElementById('startall');
    const timerdisplay = document.getElementById('timerdisplay');
    const currentinfo = document.getElementById('currentinfo');
    const tasktotal = document.getElementById('tasktotal');
    const alltasks = document.getElementById('alltasks');
    const activetasks = document.getElementById('activetasks');
    const completedtasks = document.getElementById('completedtasks'); 
    const main = document.getElementById('main');
    const summary = document.getElementById('summary');
    const goback = document.getElementById('goback');
    const startnew = document.getElementById('startnew');
    const plannedtime = document.getElementById('plannedtime');
    const actualtime = document.getElementById('actualtime');
    const taskeff = document.getElementById('taskeff');
    const taskdetails = document.getElementById('taskdetails');

    
    let tasks = JSON.parse(localStorage.getItem('mytasks')) || [];
    let nowtask = -1;
    let clock = null;
    let timeleft = 0;
    let runningall = false;
    let taskqueue = [];
    let queueindex = 0;
    let breakclock = null;

    
    function startapp() {
        showtasks();
        updatenumbers();
        setdate();
        goback.addEventListener('click', showmain);
        startnew.addEventListener('click', newall);
    }

    function setdate() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        taskdate.min = `${y}-${m}-${day}T${h}:${min}`;
    }

 
    addtask.addEventListener('click', function() {
        const name = taskname.value.trim();
        const minutes = parseInt(tasktime.value);
        const date = taskdate.value;
        const prio = taskprio.value;

        if (!name || !minutes || !date) {
            alert('Fill all fields');
            return;
        }

        if (new Date(date) < new Date()) {
            alert('No past dates');
            return;
        }

        const task = {
            id: Date.now(),
            name: name,
            minutes: minutes,
            date: date,
            prio: prio,
            status: 'pending',
            start: null,
            end: null,
            used: null
        };

        tasks.push(task);
        save();
        showtasks();
        updatenumbers();

        taskname.value = '';
        tasktime.value = '';
        taskdate.value = '';
        taskprio.value = 'medium';
    });

  
    function showtasks() {
        taskslist.innerHTML = '';

        if (tasks.length === 0) {
            taskslist.innerHTML = `
                <div class="notasks">
                    <i class="fas fa-clipboard"></i>
                    <p>No tasks added</p>
                </div>`;
            tasktotal.textContent = '0 tasks';
            return;
        }

        tasktotal.textContent = tasks.length + ' tasks';

        tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'taskitem';
            item.draggable = true;
            item.dataset.id = task.id;

            const d = new Date(task.date);
            const datestr = d.toLocaleDateString();
            const timestr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            item.innerHTML = `
                <div class="cardhead">
                    <div class="tasktitle">${task.name}</div>
                    <span class="taskstatus ${task.status}">${task.status}</span>
                </div>
                <div class="taskdetails">
                    <div><i class="fas fa-clock"></i> ${task.minutes} min</div>
                    <div><span class="priodot ${task.prio}"></span> ${task.prio}</div>
                    <div><i class="fas fa-calendar"></i> ${datestr}</div>
                    <div><i class="fas fa-hourglass"></i> ${timestr}</div>
                </div>
                ${task.used ? `<div class="taskdetails"><i class="fas fa-stopwatch"></i> Time: ${formattime(task.used)}</div>` : ''}
                <div class="taskactions">
                    <button class="button startbutton starttask" data-id="${task.id}"><i class="fas fa-play"></i>Start</button>
                    <button class="button donebutton finishtask" data-id="${task.id}"><i class="fas fa-check"></i>Completed</button>
                    <button class="button skipbutton skiptask" data-id="${task.id}"><i class="fas fa-forward"></i>Skip</button>
                    <button class="button deletebutton deletetask" data-id="${task.id}"><i class="fas fa-trash"></i>Delete</button>
                </div>`;

            taskslist.appendChild(item);
        });

    
        document.querySelectorAll('.starttask').forEach(btn => {
            btn.addEventListener('click', function() {
                begintask(parseInt(this.dataset.id));
            });
        });

        document.querySelectorAll('.finishtask').forEach(btn => {
            btn.addEventListener('click', function() {
                endtask(parseInt(this.dataset.id));
            });
        });

        document.querySelectorAll('.skiptask').forEach(btn => {
            btn.addEventListener('click', function() {
                nexttask(parseInt(this.dataset.id));
            });
        });

        document.querySelectorAll('.deletetask').forEach(btn => {
            btn.addEventListener('click', function() {
                removetask(parseInt(this.dataset.id));
            });
        });

        setupdrag();
    }

 
    function setupdrag() {
        const items = document.querySelectorAll('.taskitem');
        let dragitem = null;

        items.forEach(item => {
            item.addEventListener('dragstart', function() {
                dragitem = this;
                setTimeout(() => this.classList.add('dragging'), 0);
            });

            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                dragitem = null;
                const neworder = [];
                document.querySelectorAll('.taskitem').forEach(el => {
                    const id = parseInt(el.dataset.id);
                    const t = tasks.find(x => x.id === id);
                    if (t) neworder.push(t);
                });
                tasks = neworder;
                save();
            });
        });

        taskslist.addEventListener('dragover', e => {
            e.preventDefault();
            const after = getafter(taskslist, e.clientY);
            const drag = document.querySelector('.dragging');
            if (!after) {
                taskslist.appendChild(drag);
            } else {
                taskslist.insertBefore(drag, after);
            }
        });
    }

    function getafter(container, y) {
        const items = [...container.querySelectorAll('.taskitem:not(.dragging)')];
        return items.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: -Infinity }).element;
    }

    
    function begintask(id) {
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return;

        const task = tasks[idx];
        const now = new Date();
        if (now < new Date(task.date)) {
            alert("Wait for scheduled time");
            return;
        }

        if (nowtask !== -1 && tasks[nowtask].status === 'active') {
            tasks[nowtask].status = 'pending';
        }

        task.status = 'active';
        task.start = new Date().toISOString();
        nowtask = idx;
        timeleft = task.minutes * 60;

        currentinfo.innerHTML = `Now: ${task.name} (${task.minutes} min)`;
        updatenumbers();
        showtasks();
        startclock();
    }

    function endtask(id) {
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return;

        clearInterval(clock);
        const task = tasks[idx];
        task.status = 'done';
        task.end = new Date().toISOString();
        
        if (task.start) {
            task.used = Math.floor((new Date(task.end) - new Date(task.start)) / 1000);
        }

        if (idx === nowtask) {
            nowtask = -1;
            timerdisplay.innerHTML = '<i class="fas fa-check"></i> Done!';
            currentinfo.innerHTML = '';
        }

        updatenumbers();
        save();
        showtasks();

        if (runningall) {
            const current = taskqueue[queueindex];
            if (current && current.id === id) {
                queueindex++;
                if (queueindex < taskqueue.length) {
                    startbreak();
                } else {
                    runningall = false;
                    if (alldone()) {
                        setTimeout(() => showresult(), 1000);
                    }
                }
            }
        } else if (alldone()) {
            setTimeout(() => showresult(), 1000);
        }
    }

    function nexttask(id) {
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return;

        clearInterval(clock);
        const task = tasks[idx];
        task.status = 'pending';
        task.start = null;

        if (idx === nowtask) {
            nowtask = -1;
            timerdisplay.innerHTML = '<i class="fas fa-forward"></i> Skipped!';
            currentinfo.innerHTML = '';
        }

        updatenumbers();
        save();
        showtasks();
    }

    function removetask(id) {
        if (!confirm('Delete this?')) return;
        
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return;

        if (idx === nowtask) {
            clearInterval(clock);
            nowtask = -1;
            timerdisplay.innerHTML = '<i class="fas fa-trash"></i> Deleted!';
            currentinfo.innerHTML = '';
        }

        tasks.splice(idx, 1);
        updatenumbers();
        save();
        showtasks();
    }

  
    function startalltasks() {
        taskqueue = tasks.filter(t => t.status === 'pending');
        if (taskqueue.length === 0) {
            alert('No tasks to start!');
            return;
        }

        runningall = true;
        queueindex = 0;
        startnext();
    }

    function startnext() {
        if (queueindex >= taskqueue.length) {
            runningall = false;
            return;
        }

        const task = taskqueue[queueindex];
        begintask(task.id);
    }

    function startbreak() {
        clearInterval(clock);
        let breaktime = 30;
        
        timerdisplay.innerHTML = `<i class="fas fa-coffee"></i> Break: 30s`;
        currentinfo.innerHTML = '30 second break...';
        
        breakclock = setInterval(() => {
            if (breaktime <= 0) {
                clearInterval(breakclock);
                timerdisplay.innerHTML = '<i class="fas fa-play"></i> Break done!';
                setTimeout(() => {
                    startnext();
                }, 1000);
                return;
            }
            timerdisplay.innerHTML = `<i class="fas fa-coffee"></i> Break: ${breaktime}s`;
            breaktime--;
        }, 1000);
    }

   
    function startclock() {
        clearInterval(clock);
        clock = setInterval(() => {
            if (timeleft <= 0) {
                clearInterval(clock);
                if (nowtask !== -1) {
                    endtask(tasks[nowtask].id);
                }
                return;
            }
            const min = Math.floor(timeleft / 60);
            const sec = timeleft % 60;
            timerdisplay.innerHTML = `<i class="fas fa-clock"></i> ${min}:${sec.toString().padStart(2, '0')}`;
            timeleft--;
        }, 1000);
    }

   
    function alldone() {
        return tasks.length > 0 && tasks.every(task => task.status === 'done');
    }

    function showresult() {
        calcresult();
        main.style.display = 'none';
        summary.style.display = 'block';
    }

    function showmain() {
        summary.style.display = 'none';
        main.style.display = 'block';
    }

    function newall() {
        tasks = [];
        save();
        showtasks();
        updatenumbers();
        showmain();
    }

    function calcresult() {
        const done = tasks.filter(task => task.status === 'done');
        
        const planmin = done.reduce((sum, task) => sum + task.minutes, 0);
        const actualsec = done.reduce((sum, task) => sum + (task.used || 0), 0);
        const actualmin = Math.round(actualsec / 60);
        
        let eff = 0;
        if (actualmin > 0) {
            eff = Math.round((planmin / actualmin) * 100);
        }

        plannedtime.textContent = planmin + ' min';
        actualtime.textContent = actualmin + ' min';
        taskeff.textContent = eff + '%';

        showdetails(done);
    }

    function showdetails(done) {
        taskdetails.innerHTML = done.map(task => `
            <div class="summaryitem">
                <div class="itemhead">
                    <div class="itemtitle">${task.name}</div>
                    <span class="priobadge ${task.prio}">${task.prio}</span>
                </div>
                <div class="iteminfo">
                    <div><i class="fas fa-clock"></i> Plan: ${task.minutes} min</div>
                    <div><i class="fas fa-stopwatch"></i> Actual: ${task.used ? formattime(task.used) : 'N/A'}</div>
                    <div><i class="fas fa-calendar"></i> ${new Date(task.date).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    }

 
    function updatenumbers() {
        alltasks.textContent = tasks.length;
        activetasks.textContent = tasks.filter(t => t.status === 'active').length;
        completedtasks.textContent = tasks.filter(t => t.status === 'done').length;
    }

    function formattime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return h + 'h ' + m + 'm ' + s + 's';
        if (m > 0) return m + 'm ' + s + 's';
        return s + 's';
    }

    function save() {
        localStorage.setItem('mytasks', JSON.stringify(tasks));
    }


    startall.addEventListener('click', startalltasks);

    
    startapp();
});