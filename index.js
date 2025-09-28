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

   