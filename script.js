// ข้อมูลสำหรับเก็บลง Local Storage
const STORAGE_KEY = 'votingData';
const VOTES_KEY = 'votes';
const CLASSROOMS_KEY = 'classrooms';
const POLL_KEY = 'currentPoll';

// ข้อมูลคลาส
const GRADES = 6;
const CLASSROOMS_PER_GRADE = 13;

// ตัวแปรสถานะ
let currentGrade = null;
let currentClassroom = null;
let currentPoll = null;
let pollOptions = [];

// เริ่มต้นระบบ
window.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
    loadClassroomImages();
    loadCurrentPoll();
});

// เตรียมระบบ
function initializeSystem() {
    // โหลดข้อมูลจาก Local Storage
    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            [CLASSROOMS_KEY]: {},
            [VOTES_KEY]: []
        }));
    }
}

// เลือกชั้น
function selectGrade(grade) {
    currentGrade = grade;
    document.getElementById('selectedGradeDisplay').textContent = grade;
    
    // สร้างปุ่มห้องเรียน
    createClassroomButtons();
    
    // ซ่อนการเลือกชั้น แสดงการเลือกห้อง
    document.getElementById('gradeSelection').classList.add('hidden');
    document.getElementById('classroomSelection').classList.remove('hidden');
}

// สร้างปุ่มห้องเรียน
function createClassroomButtons() {
    const grid = document.getElementById('classroomGrid');
    grid.innerHTML = '';
    
    const votes = getVotes();
    
    for (let room = 1; room <= CLASSROOMS_PER_GRADE; room++) {
        const btn = document.createElement('button');
        btn.className = 'classroom-btn';
        btn.textContent = `ห้อง ${room}`;
        
        // ตรวจสอบว่าห้องนี้โหวตแล้วหรือไม่
        const classroomKey = `${currentGrade}-${room}`;
        const hasVoted = votes.some(v => v.classroom === classroomKey && v.poll === currentPoll?.id);
        
        if (hasVoted) {
            btn.classList.add('voted');
        }
        
        btn.onclick = () => selectClassroom(room);
        grid.appendChild(btn);
    }
}

// เลือกห้องเรียน
function selectClassroom(room) {
    currentClassroom = room;
    document.getElementById('classroomNumberDisplay').textContent = room;
    document.getElementById('gradeNumberDisplay').textContent = currentGrade;
    
    // โหลดรูปห้อง
    loadClassroomImage();
    
    // รีเซ็ตฟอร์ม
    document.getElementById('studentName').value = '';
    document.getElementById('studentID').value = '';
    document.getElementById('pollSection').classList.add('hidden');
    document.getElementById('voteSuccessMessage').classList.add('hidden');
    document.getElementById('alreadyVotedMessage').classList.add('hidden');
    
    // ซ่อนการเลือกห้อง แสดงหน้าโหวต
    document.getElementById('classroomSelection').classList.add('hidden');
    document.getElementById('votingPage').classList.remove('hidden');
}

// โหลดรูปห้อง
function loadClassroomImage() {
    const classroomKey = `${currentGrade}-${currentClassroom}`;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const imageData = data[CLASSROOMS_KEY][classroomKey];
    
    const img = document.getElementById('classroomImage');
    if (imageData) {
        img.src = imageData;
    } else {
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="250"%3E%3Crect fill="%23ddd" width="400" height="250"/%3E%3Ctext x="50%" y="50%" font-size="20" fill="%23999" text-anchor="middle" dy=".3em"%3Eไม่มีรูปห้อง%3C/text%3E%3C/svg%3E';
    }
}

// โหลดรูปห้องทั้งหมด
function loadClassroomImages() {
    // ดึงข้อมูลรูปจาก Local Storage
}

// ตรวจสอบนักเรียน
function verifyStudent() {
    const name = document.getElementById('studentName').value.trim();
    const studentID = document.getElementById('studentID').value.trim();
    
    if (!name || !studentID) {
        alert('กรุณากรอกชื่อและเลขที่นักเรียน');
        return;
    }
    
    // เก็บข้อมูลนักเรียน
    sessionStorage.setItem('studentName', name);
    sessionStorage.setItem('studentID', studentID);
    
    // ตรวจสอบว่าโหวตแล้วไหม
    if (checkIfAlreadyVoted(name, studentID)) {
        document.getElementById('pollSection').classList.add('hidden');
        document.getElementById('alreadyVotedMessage').classList.remove('hidden');
        return;
    }
    
    // แสดงฟอร์มโหวต
    document.getElementById('pollSection').classList.remove('hidden');
    createPollOptionsUI();
}

// ตรวจสอบว่าโหวตแล้วไหม
function checkIfAlreadyVoted(name, studentID) {
    if (!currentPoll) return false;
    
    const votes = getVotes();
    const classroomKey = `${currentGrade}-${currentClassroom}`;
    
    return votes.some(v => 
        v.name === name && 
        v.studentID === studentID && 
        v.poll === currentPoll.id &&
        v.classroom === classroomKey
    );
}

// สร้าง UI ตัวเลือกการโหวต
function createPollOptionsUI() {
    const container = document.getElementById('pollOptions');
    container.innerHTML = '';
    
    if (!currentPoll || currentPoll.options.length === 0) {
        container.innerHTML = '<p>ไม่มีตัวเลือก</p>';
        return;
    }
    
    currentPoll.options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'poll-option';
        
        const input = document.createElement('input');
        input.type = 'radio';
        input.id = `option-${index}`;
        input.name = 'poll-option';
        input.value = index;
        
        const label = document.createElement('label');
        label.htmlFor = `option-${index}`;
        label.textContent = option;
        
        div.appendChild(input);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// ส่งการโหวต
function submitVote() {
    const selected = document.querySelector('input[name="poll-option"]:checked');
    
    if (!selected) {
        alert('กรุณาเลือกตัวเลือก');
        return;
    }
    
    const name = sessionStorage.getItem('studentName');
    const studentID = sessionStorage.getItem('studentID');
    const classroomKey = `${currentGrade}-${currentClassroom}`;
    const selectedOption = currentPoll.options[selected.value];
    
    // บันทึกการโหวต
    const votes = getVotes();
    votes.push({
        id: Date.now(),
        name: name,
        studentID: studentID,
        classroom: classroomKey,
        poll: currentPoll.id,
        option: selectedOption,
        timestamp: new Date().toISOString()
    });
    
    saveVotes(votes);
    
    // แสดงข้อความสำเร็จ
    document.getElementById('pollSection').classList.add('hidden');
    document.getElementById('voteSuccessMessage').classList.remove('hidden');
    
    // เคลียร์ Session Storage
    sessionStorage.removeItem('studentName');
    sessionStorage.removeItem('studentID');
}

// รีเซ็ต
function reset() {
    currentClassroom = null;
    document.getElementById('votingPage').classList.add('hidden');
    document.getElementById('classroomSelection').classList.remove('hidden');
    document.getElementById('gradeSelection').classList.remove('hidden');
    
    createClassroomButtons();
}

// กลับไปเลือกชั้น
function backToGrade() {
    currentGrade = null;
    document.getElementById('classroomSelection').classList.add('hidden');
    document.getElementById('gradeSelection').classList.remove('hidden');
}

// กลับไปเลือกห้อง
function backToClassroom() {
    currentClassroom = null;
    document.getElementById('votingPage').classList.add('hidden');
    document.getElementById('classroomSelection').classList.remove('hidden');
}

// ═══ ส่วนจัดการ (Admin) ═══

// เปิด/ปิด Admin Panel
function toggleAdmin() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('hidden');
}

// อัพเดทตัวเลือกห้องในหน้า Admin
function updateClassroomSelect() {
    const gradeSelect = document.getElementById('adminGradeSelect');
    const classroomSelect = document.getElementById('adminClassroomSelect');
    const grade = gradeSelect.value;
    
    classroomSelect.innerHTML = '<option value="">เลือกห้อง</option>';
    
    if (grade) {
        for (let room = 1; room <= CLASSROOMS_PER_GRADE; room++) {
            const option = document.createElement('option');
            option.value = `${grade}-${room}`;
            option.textContent = `ห้อง ${room} ม.${grade}`;
            classroomSelect.appendChild(option);
        }
    }
}

// อัพโหลดรูปห้อง
function uploadClassroomImage() {
    const classroomSelect = document.getElementById('adminClassroomSelect');
    const imageInput = document.getElementById('imageUpload');
    
    if (!classroomSelect.value) {
        alert('กรุณาเลือกห้องเรียน');
        return;
    }
    
    if (!imageInput.files || imageInput.files.length === 0) {
        alert('กรุณาเลือกรูป');
        return;
    }
    
    const file = imageInput.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const classroomKey = classroomSelect.value;
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        data[CLASSROOMS_KEY][classroomKey] = e.target.result;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        alert('อัพโหลดรูปสำเร็จ!');
        imageInput.value = '';
    };
    
    reader.readAsDataURL(file);
}

// เพิ่มตัวเลือกการโหวต
let optionCount = 0;

function addPollOption() {
    optionCount++;
    const container = document.getElementById('pollOptionsInput');
    
    const div = document.createElement('div');
    div.id = `option-input-${optionCount}`;
    div.style.marginBottom = '10px';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `ตัวเลือกที่ ${optionCount}`;
    input.className = 'poll-option-input';
    
    const btn = document.createElement('button');
    btn.textContent = 'ลบ';
    btn.style.marginLeft = '10px';
    btn.style.padding = '10px 15px';
    btn.style.background = '#dc3545';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.onclick = () => {
        div.remove();
    };
    
    div.appendChild(input);
    div.appendChild(btn);
    container.appendChild(div);
}

// สร้างการโหวต
function createPoll() {
    const title = document.getElementById('pollTitle').value.trim();
    const description = document.getElementById('pollDescription').value.trim();
    
    if (!title) {
        alert('กรุณากรอกหัวข้อการโหวต');
        return;
    }
    
    const optionInputs = document.querySelectorAll('.poll-option-input');
    const options = Array.from(optionInputs)
        .map(input => input.value.trim())
        .filter(value => value.length > 0);
    
    if (options.length < 2) {
        alert('กรุณาเพิ่มตัวเลือกอย่างน้อย 2 ตัวเลือก');
        return;
    }
    
    const poll = {
        id: Date.now(),
        title: title,
        description: description,
        options: options,
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    
    localStorage.setItem(POLL_KEY, JSON.stringify(poll));
    currentPoll = poll;
    
    alert('สร้างการโหวตสำเร็จ!');
    
    // รีเซ็ตฟอร์ม
    document.getElementById('pollTitle').value = '';
    document.getElementById('pollDescription').value = '';
    document.getElementById('pollOptionsInput').innerHTML = '';
    optionCount = 0;
}

// ดูผลการโหวต
function showResults() {
    if (!currentPoll) {
        alert('ยังไม่มีการโหวต');
        return;
    }
    
    const votes = getVotes();
    const pollVotes = votes.filter(v => v.poll === currentPoll.id);
    
    const resultsDiv = document.getElementById('resultsDisplay');
    resultsDiv.innerHTML = `<h4>${currentPoll.title}</h4>`;
    
    if (pollVotes.length === 0) {
        resultsDiv.innerHTML += '<p>ยังไม่มีการโหวต</p>';
        return;
    }
    
    // นับการโหวตแต่ละตัวเลือก
    const counts = {};
    currentPoll.options.forEach(option => {
        counts[option] = 0;
    });
    
    pollVotes.forEach(vote => {
        counts[vote.option]++;
    });
    
    // แสดงผล
    const maxVotes = Math.max(...Object.values(counts));
    
    Object.entries(counts).forEach(([option, count]) => {
        const percentage = (count / pollVotes.length * 100).toFixed(1);
        const barWidth = maxVotes > 0 ? (count / maxVotes * 100) : 0;
        
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
            <div class="result-item-title">${option}</div>
            <div class="result-bar">
                <div class="result-bar-fill" style="width: ${barWidth}%">
                    ${count} คน (${percentage}%)
                </div>
            </div>
        `;
        resultsDiv.appendChild(resultItem);
    });
    
    resultsDiv.innerHTML += `<p style="margin-top: 15px; color: #666;">รวมการโหวต: ${pollVotes.length} คน</p>`;
}

// ═══ ฟังก์ชันช่วย (Helper Functions) ═══

// ดึงข้อมูลการโหวต
function getVotes() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data[VOTES_KEY] || [];
}

// บันทึกการโหวต
function saveVotes(votes) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    data[VOTES_KEY] = votes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// โหลดการโหวตปัจจุบัน
function loadCurrentPoll() {
    const pollData = localStorage.getItem(POLL_KEY);
    if (pollData) {
        currentPoll = JSON.parse(pollData);
    }
}
