// ข้อมูลสำหรับเก็บลง Local Storage
const STORAGE_KEY = 'votingData';
const STUDENTS_KEY = 'students';
const VOTES_KEY = 'votes';
const CLASSROOMS_KEY = 'classrooms';
const POLL_KEY = 'currentPoll';
const ADMIN_PASSWORD = 'admin123';

// ===== Google Form ส่งข้อมูล =====
// ต้องอัพเดทให้ตรงกับ Google Form ของคุณ
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse';

// ชื่อ Field ใน Google Form (ให้แก้ให้ตรงกับ Form ของคุณ)
const FORM_FIELDS = {
    studentID: 'entry_1234567890',      // เลขประจำตัวนักเรียน
    studentName: 'entry_1111111111',    // ชื่อ
    grade: 'entry_2222222222',          // ชั้น
    classroom: 'entry_3333333333',      // ห้อง
    pollTitle: 'entry_4444444444',      // หัวข้อโหวต
    pollOption: 'entry_5555555555',     // ตัวเลือก
    timestamp: 'entry_6666666666'       // เวลา
};

// ข้อมูลคลาส
const GRADES = 6;
const CLASSROOMS_PER_GRADE = 13;

// ตัวแปรสถานะ
let currentGrade = null;
let currentClassroom = null;
let currentPoll = null;
let currentUser = null;
let isAdminMode = false;
let optionCount = 0;

// เริ่มต้นระบบ
window.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
    checkCurrentUser();
});

// เตรียมระบบ
function initializeSystem() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            [STUDENTS_KEY]: {},
            [CLASSROOMS_KEY]: {},
            [VOTES_KEY]: []
        }));
    }
    loadCurrentPoll();
}

// ตรวจสอบผู้ใช้ที่เข้าสู่ระบบ
function checkCurrentUser() {
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        if (currentUser.isAdmin) {
            isAdminMode = true;
            showAdminPage();
        } else {
            showGradeSelection();
        }
    } else {
        showLoginPage();
    }
}

// ═══ หน้า Login ═══

function showLoginPage() {
    hideAll();
    document.getElementById('studentLoginPage').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('active');
    document.getElementById('loginForm').classList.add('hidden');
}

function backToStudentLogin() {
    document.getElementById('adminLoginPage').classList.add('hidden');
    document.getElementById('studentLoginPage').classList.remove('hidden');
}

function goToAdminLogin() {
    document.getElementById('studentLoginPage').classList.add('hidden');
    document.getElementById('adminLoginPage').classList.remove('hidden');
}

// ═══ ระบบลงทะเบียนนักเรียน ═══

function switchStudentTab(tab) {
    if (tab === 'register') {
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('loginForm').classList.remove('active');
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.querySelectorAll('.tab-btn')[1].classList.remove('active');
    } else {
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('registerForm').classList.remove('active');
        document.querySelectorAll('.tab-btn')[0].classList.remove('active');
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
    }
}

document.addEventListener('change', (e) => {
    if (e.target.id === 'regGrade') {
        const grade = e.target.value;
        const classroomSelect = document.getElementById('regClassroom');
        classroomSelect.innerHTML = '<option value="">เลือกห้อง</option>';
        
        if (grade) {
            for (let room = 1; room <= CLASSROOMS_PER_GRADE; room++) {
                const option = document.createElement('option');
                option.value = room;
                option.textContent = `ห้อง ${room}`;
                classroomSelect.appendChild(option);
            }
        }
    }
});

function registerStudent() {
    const studentID = document.getElementById('regStudentID').value.trim();
    const name = document.getElementById('regName').value.trim();
    const grade = document.getElementById('regGrade').value;
    const classroom = document.getElementById('regClassroom').value;
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;

    if (!studentID || !name || !grade || !classroom || !password) {
        alert('กรุณากรอกข้อมูลให้ครบทั้งหมด');
        return;
    }

    if (password !== passwordConfirm) {
        alert('รหัสผ่านไม่ตรงกัน');
        return;
    }

    if (password.length < 4) {
        alert('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
        return;
    }

    const students = getStudents();
    
    if (students[studentID]) {
        alert('เลขประจำตัวนี้ลงทะเบียนแล้ว');
        return;
    }

    students[studentID] = {
        studentID,
        name,
        grade: parseInt(grade),
        classroom: parseInt(classroom),
        password: hashPassword(password),
        registeredAt: new Date().toISOString()
    };

    saveStudents(students);
    alert('ลงทะเบียนสำเร็จ! โปรดเข้าสู่ระบบ');
    
    document.getElementById('regStudentID').value = '';
    document.getElementById('regName').value = '';
    document.getElementById('regGrade').value = '';
    document.getElementById('regClassroom').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regPasswordConfirm').value = '';
    
    switchStudentTab('login');
}

function studentLogin() {
    const studentID = document.getElementById('loginStudentID').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!studentID || !password) {
        alert('กรุณากรอกเลขประจำตัวและรหัสผ่าน');
        return;
    }

    const students = getStudents();
    const student = students[studentID];

    if (!student) {
        alert('ไม่พบเลขประจำตัวนี้');
        return;
    }

    if (student.password !== hashPassword(password)) {
        alert('รหัสผ่านไม่ถูกต้อง');
        return;
    }

    currentUser = {
        studentID: student.studentID,
        name: student.name,
        grade: student.grade,
        classroom: student.classroom,
        isAdmin: false
    };

    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    document.getElementById('loginStudentID').value = '';
    document.getElementById('loginPassword').value = '';
    
    showGradeSelection();
}

function adminLogin() {
    const password = document.getElementById('adminPassword').value;

    if (!password) {
        alert('กรุณากรอกรหัสผ่าน');
        return;
    }

    if (hashPassword(password) !== hashPassword(ADMIN_PASSWORD)) {
        alert('รหัสผ่านไม่ถูกต้อง');
        return;
    }

    currentUser = {
        isAdmin: true
    };

    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    document.getElementById('adminPassword').value = '';
    isAdminMode = true;
    showAdminPage();
}

// ═══ ฟังก์ชันแสดงหน้า ═══

function showGradeSelection() {
    hideAll();
    document.getElementById('gradeSelection').classList.remove('hidden');
    document.getElementById('currentUserDisplay').textContent = `ผู้ใช้: ${currentUser.name} (เลขที่ ${currentUser.studentID})`;
}

function showAdminPage() {
    hideAll();
    document.getElementById('adminPage').classList.remove('hidden');
}

function hideAll() {
    document.getElementById('studentLoginPage').classList.add('hidden');
    document.getElementById('adminLoginPage').classList.add('hidden');
    document.getElementById('gradeSelection').classList.add('hidden');
    document.getElementById('classroomSelection').classList.add('hidden');
    document.getElementById('votingPage').classList.add('hidden');
    document.getElementById('adminPage').classList.add('hidden');
}

function logout() {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    isAdminMode = false;
    currentGrade = null;
    currentClassroom = null;
    showLoginPage();
}

// ═══ นักเรียน - เลือกชั้นและห้อง ═══

function selectGrade(grade) {
    currentGrade = grade;
    document.getElementById('selectedGradeDisplay').textContent = grade;
    
    createClassroomButtons();
    
    document.getElementById('gradeSelection').classList.add('hidden');
    document.getElementById('classroomSelection').classList.remove('hidden');
}

function createClassroomButtons() {
    const grid = document.getElementById('classroomGrid');
    grid.innerHTML = '';
    
    const votes = getVotes();
    
    for (let room = 1; room <= CLASSROOMS_PER_GRADE; room++) {
        const btn = document.createElement('button');
        btn.className = 'classroom-btn';
        btn.textContent = `ห้อง ${room}`;
        
        const classroomKey = `${currentGrade}-${room}`;
        const hasVoted = votes.some(v => 
            v.classroom === classroomKey && 
            v.poll === currentPoll?.id &&
            v.studentID === currentUser.studentID
        );
        
        if (hasVoted) {
            btn.classList.add('voted');
        }
        
        btn.onclick = () => selectClassroom(room);
        grid.appendChild(btn);
    }
}

function selectClassroom(room) {
    currentClassroom = room;
    document.getElementById('classroomNumberDisplay').textContent = room;
    document.getElementById('gradeNumberDisplay').textContent = currentGrade;
    
    loadClassroomImage();
    
    document.getElementById('classroomSelection').classList.add('hidden');
    document.getElementById('votingPage').classList.remove('hidden');
    
    showPollOrMessage();
}

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

function showPollOrMessage() {
    if (!currentPoll) {
        document.getElementById('pollSection').classList.add('hidden');
        document.getElementById('voteSuccessMessage').classList.add('hidden');
        document.getElementById('alreadyVotedMessage').classList.add('hidden');
        document.getElementById('noPolsMessage').classList.remove('hidden');
        return;
    }

    const votes = getVotes();
    const classroomKey = `${currentGrade}-${currentClassroom}`;
    const hasVoted = votes.some(v => 
        v.classroom === classroomKey && 
        v.poll === currentPoll.id &&
        v.studentID === currentUser.studentID
    );

    document.getElementById('noPolsMessage').classList.add('hidden');
    document.getElementById('voteSuccessMessage').classList.add('hidden');
    document.getElementById('alreadyVotedMessage').classList.add('hidden');

    if (hasVoted) {
        document.getElementById('pollSection').classList.add('hidden');
        document.getElementById('alreadyVotedMessage').classList.remove('hidden');
    } else {
        document.getElementById('pollSection').classList.remove('hidden');
        createPollOptionsUI();
    }
}

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

function submitVote() {
    const selected = document.querySelector('input[name="poll-option"]:checked');
    
    if (!selected) {
        alert('กรุณาเลือกตัวเลือก');
        return;
    }
    
    const classroomKey = `${currentGrade}-${currentClassroom}`;
    const selectedOption = currentPoll.options[selected.value];
    
    const voteData = {
        id: Date.now(),
        studentID: currentUser.studentID,
        name: currentUser.name,
        classroom: classroomKey,
        poll: currentPoll.id,
        option: selectedOption,
        timestamp: new Date().toISOString()
    };
    
    // บันทึกใน Local Storage
    const votes = getVotes();
    votes.push(voteData);
    saveVotes(votes);
    
    // ส่งข้อมูลไปยัง Google Sheet
    sendToGoogleForm(voteData);
    
    document.getElementById('pollSection').classList.add('hidden');
    document.getElementById('voteSuccessMessage').classList.remove('hidden');
}

// ═══ ส่งข้อมูลไปยัง Google Form ═══
function sendToGoogleForm(voteData) {
    const formData = new FormData();
    
    formData.append(FORM_FIELDS.studentID, voteData.studentID);
    formData.append(FORM_FIELDS.studentName, voteData.name);
    formData.append(FORM_FIELDS.grade, currentGrade);
    formData.append(FORM_FIELDS.classroom, currentClassroom);
    formData.append(FORM_FIELDS.pollTitle, currentPoll.title);
    formData.append(FORM_FIELDS.pollOption, voteData.option);
    formData.append(FORM_FIELDS.timestamp, new Date().toLocaleString('th-TH'));
    
    // ส่งข้อมูลไปยัง Google Form (ใช้ CORS)
    fetch(GOOGLE_FORM_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
    })
    .then(() => {
        console.log('ส่งข้อมูลไปยัง Google Sheet สำเร็จ');
    })
    .catch((error) => {
        console.error('เกิดข้อผิดพลาด:', error);
    });
}

function backToGrade() {
    currentGrade = null;
    document.getElementById('classroomSelection').classList.add('hidden');
    document.getElementById('gradeSelection').classList.remove('hidden');
}

function backToClassroom() {
    currentClassroom = null;
    document.getElementById('votingPage').classList.add('hidden');
    document.getElementById('classroomSelection').classList.remove('hidden');
}

function reset() {
    currentClassroom = null;
    document.getElementById('votingPage').classList.add('hidden');
    document.getElementById('classroomSelection').classList.remove('hidden');
    document.getElementById('gradeSelection').classList.remove('hidden');
    createClassroomButtons();
}

// ═══ ส่วนจัดการ (Admin) ═══

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
    
    document.getElementById('pollTitle').value = '';
    document.getElementById('pollDescription').value = '';
    document.getElementById('pollOptionsInput').innerHTML = '';
    optionCount = 0;
}

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
    
    const counts = {};
    currentPoll.options.forEach(option => {
        counts[option] = 0;
    });
    
    pollVotes.forEach(vote => {
        counts[vote.option]++;
    });
    
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

function showStudentList() {
    const students = getStudents();
    const display = document.getElementById('studentListDisplay');
    
    if (Object.keys(students).length === 0) {
        display.innerHTML = '<p>ยังไม่มีนักเรียนลงทะเบียน</p>';
        return;
    }
    
    let html = '<table style="width:100%; border-collapse:collapse;">';
    html += '<tr style="background:#f0f0f0;"><th style="border:1px solid #ddd; padding:10px;">เลขประจำตัว</th>';
    html += '<th style="border:1px solid #ddd; padding:10px;">ชื่อ</th>';
    html += '<th style="border:1px solid #ddd; padding:10px;">ชั้น</th>';
    html += '<th style="border:1px solid #ddd; padding:10px;">ห้อง</th>';
    html += '<th style="border:1px solid #ddd; padding:10px;">วันที่ลงทะเบียน</th></tr>';
    
    Object.values(students).forEach(student => {
        const date = new Date(student.registeredAt).toLocaleDateString('th-TH');
        html += `<tr>
            <td style="border:1px solid #ddd; padding:10px;">${student.studentID}</td>
            <td style="border:1px solid #ddd; padding:10px;">${student.name}</td>
            <td style="border:1px solid #ddd; padding:10px;">ม.${student.grade}</td>
            <td style="border:1px solid #ddd; padding:10px;">ห้อง ${student.classroom}</td>
            <td style="border:1px solid #ddd; padding:10px;">${date}</td>
        </tr>`;
    });
    
    html += '</table>';
    display.innerHTML = html;
}

// ═══ ฟังก์ชันช่วย (Helper Functions) ═══

function hashPassword(password) {
    return password.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
    }, 0).toString();
}

function getStudents() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data[STUDENTS_KEY] || {};
}

function saveStudents(students) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    data[STUDENTS_KEY] = students;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getVotes() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data[VOTES_KEY] || [];
}

function saveVotes(votes) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    data[VOTES_KEY] = votes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadCurrentPoll() {
    const pollData = localStorage.getItem(POLL_KEY);
    if (pollData) {
        currentPoll = JSON.parse(pollData);
    }
}
