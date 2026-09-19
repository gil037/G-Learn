const GPE_CONFIG = {
  SPREADSHEET_ID: '',
  SPREADSHEET_FILE_NAME: 'Portal TC',
  MASTER_DATA_SHEET: 'Master Data',
  SESSION_TTL_SECONDS: 21600
};

const LOGIN_ACCOUNTS = {
  Administrator: { username: 'admintcgpe', password: 'admintcgpe', displayName: 'Admin TC GPE' },
  Instruktur: { username: 'trainertcgpe', password: 'trainertcgpe', displayName: 'Trainer TC GPE' }
};

const ROLE_PAGE_ACCESS = {
  Administrator: [
    'Home','Dashboard','EmployeeMaster','EmployeeVersatility','TrainingRequest','TrainingAttendance','TrainingMonitoring',
    'CandidateRegistration','OrientationAttendance','RecruitmentMonitoring',
    'EmployeeAssessment','EmployeeInduction','SimulatorTraining',
    'TrainingModules','Forms','JSA','SOP','WorkInstruction','SMKPDocuments',
    'JobCreate','JobList','JobHistory','About'
  ],
  Instruktur: [
    'Home','Dashboard','EmployeeMaster','EmployeeVersatility','TrainingAttendance','TrainingMonitoring',
    'CandidateRegistration','OrientationAttendance','RecruitmentMonitoring',
    'EmployeeAssessment','EmployeeInduction','SimulatorTraining',
    'TrainingModules','Forms','JSA','SOP','WorkInstruction','SMKPDocuments',
    'JobList','JobHistory','About'
  ],
  Guest: ['Home','Dashboard','TrainingModules','Forms','JSA','SOP','WorkInstruction','SMKPDocuments','About']
};

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_CONFIG.appName + ' | ' + APP_CONFIG.fullName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===== AUTHENTICATION =====
function loginUser(username, password, role) {
  username = String(username || '').trim();
  password = String(password || '');
  role = normalizeRole_(role);

  if (role === 'Guest') {
    const token = createSession_('Guest', 'Guest');
    return { success: true, token, role: 'Guest', displayName: 'Guest', message: 'Guest access granted.' };
  }

  const account = LOGIN_ACCOUNTS[role];
  if (!account || account.username !== username || account.password !== password) {
    throw new Error('Invalid username, password, or role.');
  }

  const token = createSession_(role, username);
  return { success: true, token, role, displayName: account.displayName, message: 'Login successful.' };
}

function normalizeRole_(role) {
  const value = String(role || '').trim();
  return value === 'Trainer' ? 'Instruktur' : value;
}

function createSession_(role, username) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(
    'GPE_SESSION_' + token,
    JSON.stringify({ role: role, username: username, createdAt: Date.now() }),
    GPE_CONFIG.SESSION_TTL_SECONDS
  );
  return token;
}

function getSession_(token) {
  const value = String(token || '').trim();
  if (!value) throw new Error('Session expired. Please log in again.');
  const cached = CacheService.getScriptCache().get('GPE_SESSION_' + value);
  if (!cached) throw new Error('Session expired. Please log in again.');
  const session = JSON.parse(cached);
  if (!ROLE_PAGE_ACCESS[session.role]) throw new Error('Invalid session role.');
  return session;
}

function validateSession_(token, allowedRoles) {
  const session = getSession_(token);
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error('You do not have permission to perform this action.');
  }
  return session;
}

function logoutUser(token) {
  const value = String(token || '').trim();
  if (value) CacheService.getScriptCache().remove('GPE_SESSION_' + value);
  return { success: true };
}

function getSessionInfo(token) {
  const session = validateSession_(token);
  const displayName = session.role === 'Administrator' ? 'Admin TC GPE' : session.role === 'Instruktur' ? 'Trainer TC GPE' : 'Guest';
  return { success: true, role: session.role, username: session.username, displayName: displayName };
}

function canAccessPage_(role, page) {
  return ROLE_PAGE_ACCESS[role] && ROLE_PAGE_ACCESS[role].includes(page);
}

function getPageHtml(token, page) {
  const session = validateSession_(token);
  if (!canAccessPage_(session.role, page)) throw new Error('Access denied for ' + session.role + ': ' + page);

  const allowed = Object.keys(ROLE_PAGE_ACCESS).reduce((arr, role) => arr.concat(ROLE_PAGE_ACCESS[role]), []);
  if (!allowed.includes(page)) throw new Error('Invalid page request: ' + page);
  return HtmlService.createHtmlOutputFromFile(page).getContent();
}

function getDatabaseSpreadsheet_() {
  if (GPE_CONFIG.SPREADSHEET_ID && String(GPE_CONFIG.SPREADSHEET_ID).trim()) {
    return SpreadsheetApp.openById(String(GPE_CONFIG.SPREADSHEET_ID).trim());
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  const files = DriveApp.getFilesByName(GPE_CONFIG.SPREADSHEET_FILE_NAME);
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) return SpreadsheetApp.openById(file.getId());
  }
  throw new Error('Spreadsheet "' + GPE_CONFIG.SPREADSHEET_FILE_NAME + '" was not found.');
}

function getMasterDataSheet_() {
  const ss = getDatabaseSpreadsheet_();
  let sheet = ss.getSheetByName(GPE_CONFIG.MASTER_DATA_SHEET);
  let warning = '';
  if (!sheet) {
    const sheets = ss.getSheets();
    sheet = sheets.find(s => s.getLastRow() > 0 && s.getLastColumn() > 0) || null;
    if (sheet) warning = 'Tab "' + GPE_CONFIG.MASTER_DATA_SHEET + '" was not found. Showing data from tab "' + sheet.getName() + '".';
  }
  if (!sheet) throw new Error('No data sheet was found in spreadsheet "' + ss.getName() + '".');
  return { spreadsheet: ss, sheet: sheet, warning: warning };
}

function getEmployeeMasterData(token) {
  validateSession_(token, ['Administrator','Instruktur']);
  const source = getMasterDataSheet_();
  const values = source.sheet.getDataRange().getDisplayValues();
  if (!values.length) return { headers: [], rows: [], total: 0, spreadsheetName: source.spreadsheet.getName(), sheetName: source.sheet.getName(), warning: source.warning };
  const headers = values[0].map(h => String(h || '').trim());
  const rows = values.slice(1).filter(row => row.some(cell => String(cell || '').trim() !== ''));
  return { headers, rows, total: rows.length, spreadsheetName: source.spreadsheet.getName(), sheetName: source.sheet.getName(), warning: source.warning };
}



// ===== TRAINING REQUEST =====
const TRAINING_REQUEST_HEADERS = [
  'Request ID','Timestamp','Program Type','Jobsite','Program Name','Training Unit','Training Versatility','Year','PIC Training','Training Participants','Status'
];
const TRAINING_PARTICIPANT_HEADERS = [
  'No','Trainee NIK','Trainee Name','Jobsite','Departement','Training Code','Program Name','Training Unit','Training Versatility','Year','PIC Training','Position','Initial Versatility','Start Date','End Date','Posttest Score','TP Evaluation Score 1','TP Evaluation Score 2','HM Progress','Probation Hand Over','Reassesment Date','Remarks','Status','Request ID'
];

// Request ID prefix wajib mengikuti Program Type.
const TRAINING_PROGRAM_CODE_MAP = {
  'Green Training': 'GT',
  'Multi Skill Training': 'MST',
  'Skill Up Training': 'SKU',
  'Similar Training': 'ST',
  'Add Versatility Type Moving': 'AVTM',
  'Add Versatility Type Full': 'AVTF'
};

function getTrainingRequestSheets_() {
  const ss = getDatabaseSpreadsheet_();
  const requestSheet = ss.getSheetByName('training_requests') || ss.insertSheet('training_requests');

  // Gunakan nama draft terbaru "Training_Participants".
  // Jika instalasi lama masih memakai "training_participants", gunakan sheet lama
  // agar data existing tidak hilang/terduplikasi.
  const participantSheet =
    ss.getSheetByName('Training_Participants') ||
    ss.getSheetByName('training_participants') ||
    ss.insertSheet('Training_Participants');

  [
    [requestSheet, TRAINING_REQUEST_HEADERS],
    [participantSheet, TRAINING_PARTICIPANT_HEADERS]
  ].forEach(([sheet, headers]) => {
    const current = sheet.getLastColumn()
      ? sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0]
      : [];
    const needs =
      sheet.getLastRow() === 0 ||
      headers.some((h, i) => String(current[i] || '').trim() !== h);

    if (needs) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    sheet
      .getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#0b1f3a')
      .setFontColor('#ffffff');

    sheet.setFrozenRows(1);
  });

  return { ss, requestSheet, participantSheet };
}

function normalizeHeader_(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function findHeaderIndex_(headers, aliases) {
  const map = headers.map(normalizeHeader_);
  for (const alias of aliases) {
    const i = map.indexOf(normalizeHeader_(alias));
    if (i >= 0) return i;
  }
  return -1;
}

function normalizeNik_(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function parseMasterDate_(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatMasterDate_(value) {
  const date = parseMasterDate_(value);
  if (!date) return String(value || '').trim();

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone() || 'Asia/Makassar',
    'dd MMMM yyyy'
  );
}

function calculateLengthOfService_(dohValue) {
  const start = parseMasterDate_(dohValue);
  if (!start) return '';

  const today = new Date();
  let years = today.getFullYear() - start.getFullYear();
  let months = today.getMonth() - start.getMonth();
  const days = today.getDate() - start.getDate();

  if (days < 0) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years < 0) return '';

  if (years === 0 && months === 0) return '< 1 Bulan';
  if (years === 0) return months + ' Bulan';
  if (months === 0) return years + ' Tahun';
  return years + ' Tahun ' + months + ' Bulan';
}

function getEmployeeData(token) {
  validateSession_(token, ['Administrator', 'Instruktur']);

  // Training Request selalu mengambil data trainee dari tab "Master Data".
  // Untuk kebutuhan pencarian trainee, hanya NIK dan Nama yang wajib ada.
  // Kolom Position/Department/DOH/Masa Kerja dibaca jika tersedia.
  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName(GPE_CONFIG.MASTER_DATA_SHEET || 'Master Data');
  if (!sheet) {
    throw new Error('Tab "Master Data" tidak ditemukan pada spreadsheet Portal TC.');
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(h => String(h || '').trim());

  const iNIK = findHeaderIndex_(headers, [
    'NIK', 'NIK Karyawan', 'NIK KARYAWAN', 'Employee ID', 'Employee NIK', 'NIK Employee'
  ]);
  const iName = findHeaderIndex_(headers, [
    'NAMA', 'NAMA KARYAWAN', 'NAMA LENGKAP', 'NAME', 'EMPLOYEE NAME', 'Employee Name', 'Nama Employee'
  ]);
  // Position Training Request diambil khusus dari kolom 'Jabatan Akhir' pada Master Data.
  const iPosition = findHeaderIndex_(headers, [
    'JABATAN AKHIR', 'POSITION', 'POSISI', 'JOB POSITION', 'JOB TITLE'
  ]);
  const iDept = findHeaderIndex_(headers, [
    'DEPARTEMEN', 'DEPARTEMENT', 'DEPARTMENT', 'DEPT', 'DEPARTMENT NAME', 'DEPARTEMEN KERJA'
  ]);
  const iDoh = findHeaderIndex_(headers, [
    'DOH', 'DATE OF HIRE', 'TANGGAL MASUK', 'TANGGAL MASUK KERJA', 'JOIN DATE', 'DATE JOIN', 'TGL MASUK'
  ]);
  const iLos = findHeaderIndex_(headers, [
    'MASA KERJA', 'LENGTH OF SERVICE', 'LOS', 'MASA KERJA (TAHUN)', 'LENGTH OF SERVICE (YEAR)'
  ]);

  if (iNIK < 0) {
    throw new Error('Kolom NIK pada tab Master Data tidak ditemukan.');
  }
  if (iName < 0) {
    throw new Error('Kolom Nama pada tab Master Data tidak ditemukan.');
  }

  return values.slice(1)
    .map(row => {
      const nik = normalizeNik_(row[iNIK]);
      const nama = String(row[iName] == null ? '' : row[iName]).trim();
      if (!nik || !nama) return null;

      const position = iPosition >= 0 ? String(row[iPosition] == null ? '' : row[iPosition]).trim() : '';
      const dohRaw = iDoh >= 0 ? String(row[iDoh] == null ? '' : row[iDoh]).trim() : '';
      const losRaw = iLos >= 0 ? String(row[iLos] == null ? '' : row[iLos]).trim() : '';

      return {
        nik: nik,
        nama: nama,
        position: position,
        departemen: iDept >= 0 ? String(row[iDept] == null ? '' : row[iDept]).trim() : '',
        doh: dohRaw ? formatMasterDate_(dohRaw) : '',
        masaKerja: losRaw || (dohRaw ? calculateLengthOfService_(dohRaw) : '')
      };
    })
    .filter(Boolean);
}

function getTrainingProgramCode_(programType) {
  const key = String(programType || '').trim();
  const code = TRAINING_PROGRAM_CODE_MAP[key];
  if (!code) throw new Error('Program Type tidak memiliki Training Code yang valid: ' + key);
  return code;
}

function ensureRequestId_(sheet, year, programType) {
  const prefix = getTrainingProgramCode_(programType);
  const date = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || 'Asia/Makassar',
    'yyyyMMdd'
  );

  const lastRow = sheet.getLastRow();
  let max = 0;

  if (lastRow >= 2) {
    const values = sheet
      .getRange(2, 1, lastRow - 1, 1)
      .getDisplayValues()
      .flat();

    const regex = new RegExp(
      '^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-' + date + '-(\\d+)$',
      'i'
    );

    values.forEach(value => {
      const match = String(value || '').trim().match(regex);
      if (match) max = Math.max(max, Number(match[1]) || 0);
    });
  }

  return prefix + '-' + date + '-' + String(max + 1).padStart(3, '0');
}

function ensureTrainingCode_(sheet, year) {
  const prefix = 'TRN-' + String(year);
  const lastRow = sheet.getLastRow();
  let max = 0;

  if (lastRow >= 2) {
    const values = sheet
      .getRange(2, 6, lastRow - 1, 1)
      .getDisplayValues()
      .flat();

    const regex = new RegExp(
      '^' + prefix + '-(\\d+)$',
      'i'
    );

    values.forEach(value => {
      const match = String(value || '').trim().match(regex);
      if (match) max = Math.max(max, Number(match[1]) || 0);
    });
  }

  return prefix + '-' + String(max + 1).padStart(3, '0');
}

function submitTraining(token, data) {
  validateSession_(token, ['Administrator']);

  if (!data) throw new Error('Training request data is required.');

  const required = [
    'programType',
    'programName',
    'jobsite',
    'trainingUnit',
    'trainingVersatility',
    'year',
    'picTraining'
  ];

  required.forEach(key => {
    if (!String(data[key] == null ? '' : data[key]).trim()) {
      throw new Error(key + ' is required.');
    }
  });

  const programType = String(data.programType).trim();
  const programName = String(data.programName).trim();
  const jobsite = String(data.jobsite).trim();
  const trainingUnit = String(data.trainingUnit).trim();
  const trainingVersatility = String(data.trainingVersatility).trim();
  const picTraining = String(data.picTraining).trim();

  if (!TRAINING_PROGRAM_TYPES.includes(programType)) throw new Error('Invalid Program Type.');
  if (!TRAINING_JOBSITES.includes(jobsite)) throw new Error('Invalid Jobsite.');
  if (!TRAINING_UNITS.includes(trainingUnit)) throw new Error('Invalid Training Unit.');
  if (!TRAINING_VERSATILITY_OPTIONS.includes(trainingVersatility)) throw new Error('Invalid Training Versatility.');
  if (!TRAINING_PIC_OPTIONS.includes(picTraining)) throw new Error('Invalid PIC Training.');

  const year = Number(data.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Invalid training year.');
  }

  // Start Date tetap didukung, tetapi opsional sesuai alur Training Request.
  const startDateText = String(data.startDate || '').trim();
  let startDate = '';

  if (startDateText) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateText)) {
      throw new Error('Invalid Start Date.');
    }

    const parsedStartDate = new Date(startDateText + 'T00:00:00');
    if (Number.isNaN(parsedStartDate.getTime())) {
      throw new Error('Invalid Start Date.');
    }

    startDate = parsedStartDate;
  }

  const participants = Array.isArray(data.participants) ? data.participants : [];
  if (!participants.length || participants.length > 100) {
    throw new Error('Participants must be between 1 and 100.');
  }

  const masterEmployees = getEmployeeData(token);
  const masterMap = new Map(
    masterEmployees.map(employee => [normalizeNik_(employee.nik), employee])
  );

  const seen = new Set();
  const validatedParticipants = participants.map((participant, index) => {
    const nik = normalizeNik_(participant && participant.nik);

    if (!nik) throw new Error('Participant ' + (index + 1) + ' belum memiliki NIK.');
    if (seen.has(nik)) throw new Error('Trainee dengan NIK ' + nik + ' dipilih lebih dari satu kali.');
    seen.add(nik);

    const masterEmployee = masterMap.get(nik);
    if (!masterEmployee) {
      throw new Error('NIK ' + nik + ' tidak ditemukan pada tab Master Data.');
    }

    const selectedVers = String(participant.initialVersatility || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);

    if (!selectedVers.length) {
      throw new Error('Initial Versatility Participant ' + (index + 1) + ' is required.');
    }

    selectedVers.forEach(value => {
      if (!TRAINING_INITIAL_VERSATILITY_OPTIONS.includes(value)) {
        throw new Error(
          'Invalid Initial Versatility for Participant ' + (index + 1) + ': ' + value
        );
      }
    });

    return {
      master: masterEmployee,
      initialVersatility: selectedVers.join(', ')
    };
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheets = getTrainingRequestSheets_();
    const requestId = ensureRequestId_(sheets.requestSheet, year, programType);
    const trainingCode = ensureTrainingCode_(sheets.participantSheet, year);
    const now = new Date();

    // Training Requests hanya menyimpan jumlah peserta, bukan daftar nama peserta.
    // Status request setelah berhasil disubmit adalah Active.
    const participantCount = validatedParticipants.length;

    sheets.requestSheet.appendRow([
      requestId,
      now,
      programType,
      jobsite,
      programName,
      trainingUnit,
      trainingVersatility,
      year,
      picTraining,
      participantCount,
      'Active'
    ]);

    const startRow = sheets.participantSheet.getLastRow() + 1;

    const rows = validatedParticipants.map((item, index) => {
      const employee = item.master;

      return [
        index + 1,
        employee.nik,
        employee.nama,
        jobsite,
        employee.departemen,
        trainingCode,
        programName,
        trainingUnit,
        trainingVersatility,
        year,
        picTraining,
        employee.position,
        item.initialVersatility,
        startDate,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        String(data.remarks || 'Inclass').trim() || 'Inclass',
        'Requested',
        requestId
      ];
    });

    sheets.participantSheet
      .getRange(startRow, 1, rows.length, TRAINING_PARTICIPANT_HEADERS.length)
      .setValues(rows);

    if (startDate) {
      sheets.participantSheet
        .getRange(startRow, 14, rows.length, 1)
        .setNumberFormat('dd mmm yyyy');
    }

    sheets.requestSheet
      .getRange(sheets.requestSheet.getLastRow(), 2)
      .setNumberFormat('dd mmm yyyy hh:mm');

    SpreadsheetApp.flush();

    return {
      success: true,
      requestId: requestId,
      trainingCode: trainingCode,
      programCode: getTrainingProgramCode_(programType),
      participantCount: rows.length,
      message: 'Training request berhasil disimpan.'
    };
  } finally {
    lock.releaseLock();
  }
}


function getTrainingMonitoringOptions_(participants) {
  const years = [];
  for (let y = 2000; y <= 2100; y++) years.push(String(y));
  const codes = [...new Set((participants || [])
    .map(p => String(p['Training Code'] || '').trim())
    .filter(Boolean))].sort();
  return {
    programTypes: TRAINING_PROGRAM_TYPES.slice(),
    jobsites: TRAINING_JOBSITES.slice(),
    trainingUnits: TRAINING_UNITS.slice(),
    trainingVersatility: TRAINING_VERSATILITY_OPTIONS.slice(),
    initialVersatility: TRAINING_INITIAL_VERSATILITY_OPTIONS.slice(),
    picTraining: TRAINING_PIC_OPTIONS.slice(),
    remarks: TRAINING_REMARKS.slice(),
    programStatuses: ['Active', 'Close', 'Hold', 'Cancel'],
    participantStatuses: ['Requested', 'Continue', 'Hold', 'Close', 'Cancel'],
    years: years,
    trainingCodes: codes
  };
}

// ===== TRAINING MONITORING =====
function getTrainingMonitoringData(token) {
  validateSession_(token, ['Administrator', 'Instruktur']);

  const ss = getDatabaseSpreadsheet_();
  const requestSheet = ss.getSheetByName('training_requests');
  const participantSheet = ss.getSheetByName('Training_Participants') || ss.getSheetByName('training_participants');

  const requests = requestSheet ? sheetRecordsWithRow_(requestSheet, TRAINING_REQUEST_HEADERS) : [];
  const participants = participantSheet ? sheetRecordsWithRow_(participantSheet, TRAINING_PARTICIPANT_HEADERS) : [];

  return {
    success: true,
    requests: requests,
    participants: participants,
    options: getTrainingMonitoringOptions_(participants),
    generatedAt: new Date().toISOString()
  };
}

function sheetRecords_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const width = headers.length;
  const values = sheet.getRange(1, 1, lastRow, width).getDisplayValues();
  return values.slice(1)
    .filter(row => row.some(cell => String(cell || '').trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => obj[header] = String(row[i] == null ? '' : row[i]).trim());
      return obj;
    });
}

function sheetRecordsWithRow_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const width = headers.length;
  const values = sheet.getRange(1, 1, lastRow, width).getDisplayValues();
  return values.slice(1)
    .map((row, i) => ({ row: i + 2, data: row }))
    .filter(item => item.data.some(cell => String(cell || '').trim() !== ''))
    .map(item => {
      const obj = { _row: item.row };
      headers.forEach((header, i) => obj[header] = String(item.data[i] == null ? '' : item.data[i]).trim());
      return obj;
    });
}

function updateTrainingRequest(token, data) {
  validateSession_(token, ['Administrator']);
  if (!data || !String(data.requestId || '').trim()) throw new Error('Request ID wajib diisi.');

  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName('training_requests');
  const participantSheet = ss.getSheetByName('Training_Participants') || ss.getSheetByName('training_participants');
  if (!sheet) throw new Error('Sheet training_requests tidak ditemukan.');

  const row = Number(data.row || 0);
  const requestId = String(data.requestId).trim();
  const rowNumber = row > 1 ? row : findRowByValue_(sheet, 1, requestId);
  if (rowNumber < 2) throw new Error('Training Request tidak ditemukan: ' + requestId);

  const programType = String(data.programType || '').trim();
  const jobsite = String(data.jobsite || '').trim();
  const programName = String(data.programName || '').trim();
  const trainingUnit = String(data.trainingUnit || '').trim();
  const trainingVersatility = String(data.trainingVersatility || '').trim();
  const year = Number(data.year);
  const picTraining = String(data.picTraining || '').trim();
  const status = String(data.status || 'Active').trim() || 'Active';

  if (!TRAINING_PROGRAM_TYPES.includes(programType)) throw new Error('Invalid Program Type.');
  if (!TRAINING_JOBSITES.includes(jobsite)) throw new Error('Invalid Jobsite.');
  if (!programName) throw new Error('Program Name wajib diisi.');
  if (!TRAINING_UNITS.includes(trainingUnit)) throw new Error('Invalid Training Unit.');
  if (!TRAINING_VERSATILITY_OPTIONS.includes(trainingVersatility)) throw new Error('Invalid Training Versatility.');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Invalid training year.');
  if (!TRAINING_PIC_OPTIONS.includes(picTraining)) throw new Error('Invalid PIC Training.');
  if (!['Active', 'Close', 'Hold', 'Cancel'].includes(status)) throw new Error('Invalid Training Request Status.');

  const actualParticipantCount = participantSheet
    ? countParticipantsByRequestId_(participantSheet, requestId)
    : Number(data.trainingParticipants || 0);

  const values = [
    requestId,
    sheet.getRange(rowNumber, 2).getValue(),
    programType,
    jobsite,
    programName,
    trainingUnit,
    trainingVersatility,
    year,
    picTraining,
    actualParticipantCount,
    status
  ];

  sheet.getRange(rowNumber, 1, 1, TRAINING_REQUEST_HEADERS.length).setValues([values]);

  // Field tertentu disalin ke Training_Participants karena tabel trainee memang memiliki
  // salinan informasi program. Ini menjaga View Program Training tetap konsisten setelah edit program.
  if (participantSheet && participantSheet.getLastRow() >= 2) {
    const last = participantSheet.getLastRow();
    const reqValues = participantSheet.getRange(2, 24, last - 1, 1).getDisplayValues().flat();
    for (let i = 0; i < reqValues.length; i++) {
      if (String(reqValues[i] || '').trim() !== requestId) continue;
      const targetRow = i + 2;
      participantSheet.getRange(targetRow, 4).setValue(jobsite);            // Jobsite
      participantSheet.getRange(targetRow, 7).setValue(programName);       // Program Name
      participantSheet.getRange(targetRow, 8).setValue(trainingUnit);      // Training Unit
      participantSheet.getRange(targetRow, 9).setValue(trainingVersatility);// Training Versatility
      participantSheet.getRange(targetRow,10).setValue(year);              // Year
      participantSheet.getRange(targetRow,11).setValue(picTraining);        // PIC Training
    }
  }

  touchDataVersion_();
  return { success: true, message: 'Training Request berhasil diperbarui.' };
}

function countParticipantsByRequestId_(sheet, requestId) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, 24, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
  return values.filter(v => String(v || '').trim() === String(requestId || '').trim()).length;
}

function toSheetDate_(value, fieldName) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Invalid ' + fieldName + '.');
  const date = new Date(text + 'T00:00:00');
  if (Number.isNaN(date.getTime())) throw new Error('Invalid ' + fieldName + '.');
  return date;
}

function updateTrainingParticipant(token, data) {
  validateSession_(token, ['Administrator']);
  if (!data || !String(data.requestId || '').trim() || !String(data.traineeNik || '').trim()) {
    throw new Error('Request ID dan NIK trainee wajib diisi.');
  }

  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName('Training_Participants') || ss.getSheetByName('training_participants');
  if (!sheet) throw new Error('Sheet Training_Participants tidak ditemukan.');

  const row = Number(data.row || 0);
  const requestId = String(data.requestId).trim();
  const traineeNik = String(data.traineeNik).trim();
  const rowNumber = row > 1 ? row : findParticipantRow_(sheet, requestId, traineeNik);
  if (rowNumber < 2) throw new Error('Data trainee tidak ditemukan.');

  const current = sheet.getRange(rowNumber, 1, 1, TRAINING_PARTICIPANT_HEADERS.length).getValues()[0];
  const byHeader = {};
  TRAINING_PARTICIPANT_HEADERS.forEach((h, i) => byHeader[h] = i);
  const setField = (header, value) => { current[byHeader[header]] = value == null ? '' : value; };

  const jobsite = String(data.jobsite || '').trim();
  const trainingCode = String(data.trainingCode || '').trim();
  const trainingUnit = String(data.trainingUnit || '').trim();
  const trainingVersatility = String(data.trainingVersatility || '').trim();
  const initialVersatility = String(data.initialVersatility || '').trim();
  const remarks = String(data.remarks || '').trim();
  const status = String(data.status || '').trim();

  if (!TRAINING_JOBSITES.includes(jobsite)) throw new Error('Invalid Jobsite.');
  if (!trainingCode) throw new Error('Training Code wajib diisi.');
  if (!TRAINING_UNITS.includes(trainingUnit)) throw new Error('Invalid Training Unit.');
  if (!TRAINING_VERSATILITY_OPTIONS.includes(trainingVersatility)) throw new Error('Invalid Training Versatility.');
  if (!initialVersatility) throw new Error('Initial Versatility wajib diisi.');
  const initialVersatilityValues = initialVersatility.split(',').map(v => v.trim()).filter(Boolean);
  if (!initialVersatilityValues.length || initialVersatilityValues.some(v => !TRAINING_INITIAL_VERSATILITY_OPTIONS.includes(v))) {
    throw new Error('Invalid Initial Versatility.');
  }
  if (!remarks || !TRAINING_REMARKS.includes(remarks)) throw new Error('Invalid Remarks.');
  if (!status || !['Requested', 'Continue', 'Hold', 'Close', 'Cancel'].includes(status)) throw new Error('Invalid trainee Status.');

  const startDate = toSheetDate_(data.startDate, 'Start Date');
  const endDate = toSheetDate_(data.endDate, 'End Date');
  const probationHandOver = toSheetDate_(data.probationHandOver, 'Probation Hand Over');
  const reassessDate = toSheetDate_(data.reassesmentDate, 'Reassesment Date');

  setField('Jobsite', jobsite);
  setField('Training Code', trainingCode);
  setField('Program Name', String(data.programName || '').trim());
  setField('Training Unit', trainingUnit);
  setField('Training Versatility', trainingVersatility);
  if (Object.prototype.hasOwnProperty.call(data, 'year')) current[byHeader['Year']] = Number(data.year) || '';
  if (Object.prototype.hasOwnProperty.call(data, 'picTraining')) current[byHeader['PIC Training']] = String(data.picTraining || '').trim();
  setField('Position', String(data.position || '').trim());
  setField('Initial Versatility', initialVersatility);
  setField('Start Date', startDate);
  setField('End Date', endDate);
  setField('Posttest Score', data.posttestScore == null ? '' : String(data.posttestScore).trim());
  setField('TP Evaluation Score 1', data.tpEvaluationScore1 == null ? '' : String(data.tpEvaluationScore1).trim());
  setField('TP Evaluation Score 2', data.tpEvaluationScore2 == null ? '' : String(data.tpEvaluationScore2).trim());
  setField('HM Progress', String(data.hmProgress || '').trim());
  setField('Probation Hand Over', probationHandOver);
  setField('Reassesment Date', reassessDate);
  setField('Remarks', remarks);
  setField('Status', status);
  current[byHeader['Request ID']] = requestId;
  current[byHeader['Trainee NIK']] = traineeNik;

  sheet.getRange(rowNumber, 1, 1, TRAINING_PARTICIPANT_HEADERS.length).setValues([current]);
  [14,15,20,21].forEach(col => sheet.getRange(rowNumber, col).setNumberFormat('dd mmm yyyy'));
  SpreadsheetApp.flush();
  touchDataVersion_();
  return { success: true, message: 'Data trainee berhasil diperbarui.' };
}

function updateTrainingParticipantsBulk(token, data) {
  validateSession_(token, ['Administrator']);
  if (!data || !Array.isArray(data.items) || !data.items.length) {
    throw new Error('Minimal satu trainee harus dipilih.');
  }

  const status = String(data.status || '').trim();
  const remarks = String(data.remarks || '').trim();
  if (!status && !remarks) throw new Error('Pilih Status atau Remarks yang akan diperbarui.');
  if (status && !['Requested', 'Continue', 'Hold', 'Close', 'Cancel'].includes(status)) {
    throw new Error('Status trainee tidak valid: ' + status);
  }
  if (remarks && !TRAINING_REMARKS.includes(remarks)) {
    throw new Error('Remarks tidak valid: ' + remarks);
  }

  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName('Training_Participants') || ss.getSheetByName('training_participants');
  if (!sheet) throw new Error('Sheet Training_Participants tidak ditemukan.');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Tidak ada data trainee.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const width = Math.max(sheet.getLastColumn(), TRAINING_PARTICIPANT_HEADERS.length);
    const values = sheet.getRange(1, 1, lastRow, width).getDisplayValues();
    const headers = values[0].map(h => String(h || '').trim());
    const col = {};
    headers.forEach((h, i) => { if (h) col[h] = i + 1; });

    const required = ['Trainee NIK', 'Request ID', 'Status', 'Remarks'];
    required.forEach(h => { if (!col[h]) throw new Error('Kolom database tidak ditemukan: ' + h); });

    const targetSet = new Set();
    data.items.forEach(item => {
      const requestId = String(item && item.requestId || '').trim();
      const traineeNik = String(item && item.traineeNik || '').trim();
      if (requestId && traineeNik) targetSet.add(requestId + '||' + traineeNik);
    });
    if (!targetSet.size) throw new Error('Daftar trainee yang dipilih tidak valid.');

    const matchedRows = [];
    for (let i = 1; i < values.length; i++) {
      const requestId = String(values[i][col['Request ID'] - 1] || '').trim();
      const traineeNik = String(values[i][col['Trainee NIK'] - 1] || '').trim();
      if (targetSet.has(requestId + '||' + traineeNik)) matchedRows.push(i + 1);
    }

    if (!matchedRows.length) {
      throw new Error('Trainee terpilih tidak ditemukan di database. Tutup View Training lalu buka kembali dan pilih trainee dari data terbaru.');
    }

    // Update only requested cells. This avoids overwriting unrelated trainee fields.
    matchedRows.forEach(row => {
      if (status) sheet.getRange(row, col['Status']).setValue(status);
      if (remarks) sheet.getRange(row, col['Remarks']).setValue(remarks);
    });
    SpreadsheetApp.flush();
    touchDataVersion_();

    return {
      success: true,
      updated: matchedRows.length,
      requestIds: [...new Set(matchedRows.map(row => String(sheet.getRange(row, col['Request ID']).getDisplayValue()).trim()))],
      message: matchedRows.length + ' trainee berhasil diperbarui.'
    };
  } finally {
    lock.releaseLock();
  }
}
function deleteTrainingParticipant(token, data) {
  validateSession_(token, ['Administrator']);
  if (!data || !String(data.requestId || '').trim() || !String(data.traineeNik || '').trim()) throw new Error('Request ID dan NIK trainee wajib diisi.');
  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName('Training_Participants') || ss.getSheetByName('training_participants');
  const requestSheet = ss.getSheetByName('training_requests');
  if (!sheet) throw new Error('Sheet Training_Participants tidak ditemukan.');
  const row = Number(data.row || 0);
  const requestId = String(data.requestId).trim();
  const traineeNik = String(data.traineeNik).trim();
  const rowNumber = row > 1 ? row : findParticipantRow_(sheet, requestId, traineeNik);
  if (rowNumber < 2) throw new Error('Data trainee tidak ditemukan.');
  sheet.deleteRow(rowNumber);
  if (requestSheet) {
    const requestRow = findRowByValue_(requestSheet, 1, requestId);
    if (requestRow > 1) {
      const count = Math.max(0, Number(requestSheet.getRange(requestRow, 10).getDisplayValue()) - 1);
      requestSheet.getRange(requestRow, 10).setValue(count);
    }
  }
  touchDataVersion_();
  return { success: true, message: 'Trainee berhasil dihapus.' };
}

function deleteTrainingRequest(token, requestId) {
  validateSession_(token, ['Administrator']);
  requestId = String(requestId || '').trim();
  if (!requestId) throw new Error('Request ID wajib diisi.');
  const ss = getDatabaseSpreadsheet_();
  const requestSheet = ss.getSheetByName('training_requests');
  const participantSheet = ss.getSheetByName('Training_Participants') || ss.getSheetByName('training_participants');
  if (!requestSheet) throw new Error('Sheet training_requests tidak ditemukan.');

  if (participantSheet && participantSheet.getLastRow() >= 2) {
    const values = participantSheet.getRange(2, 24, participantSheet.getLastRow() - 1, 1).getDisplayValues().flat();
    for (let i = values.length - 1; i >= 0; i--) {
      if (String(values[i] || '').trim() === requestId) participantSheet.deleteRow(i + 2);
    }
  }
  const requestRow = findRowByValue_(requestSheet, 1, requestId);
  if (requestRow < 2) throw new Error('Training Request tidak ditemukan: ' + requestId);
  requestSheet.deleteRow(requestRow);
  touchDataVersion_();
  return { success: true, message: 'Training Request dan seluruh trainee terkait berhasil dihapus.' };
}

function findRowByValue_(sheet, column, value) {
  if (!sheet || sheet.getLastRow() < 2) return -1;
  const vals = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
  const target = String(value || '').trim();
  const idx = vals.findIndex(v => String(v || '').trim() === target);
  return idx >= 0 ? idx + 2 : -1;
}

function findParticipantRow_(sheet, requestId, nik) {
  if (!sheet || sheet.getLastRow() < 2) return -1;
  const vals = sheet.getRange(2, 2, sheet.getLastRow() - 1, 23).getDisplayValues();
  for (let i = 0; i < vals.length; i++) {
    const rowNik = String(vals[i][0] || '').trim();
    const rowReq = String(vals[i][22] || '').trim();
    if (rowNik === String(nik).trim() && rowReq === String(requestId).trim()) return i + 2;
  }
  return -1;
}

// ===== EMPLOYEE VERSATILITY =====
const EMPLOYEE_VERSATILITY_SHEET_NAMES = [
  'Employee Versatility',
  'EMPLOYEE VERSATILITY',
  'Portal TC - Employee Versatility',
  'Employee_Versatility'
];
const EMPLOYEE_VERSATILITY_BASE_ALIASES = {
  nik: ['NIK', 'NIK Karyawan', 'Employee ID'],
  name: ['NAMA', 'NAME', 'Nama Karyawan', 'Employee Name'],
  position: ['JABATAN', 'POSITION', 'POSISI'],
  department: ['DEPARTEMEN', 'DEPARTMENT', 'DEPT'],
  stb: ['STB', 'KETERANGAN', 'REMARKS', 'REMARK']
};
// Matrix versatility wajib dibaca hanya dari kolom N sampai AN (14..40, 1-based).
const EMPLOYEE_VERSATILITY_START_COLUMN = 14;
const EMPLOYEE_VERSATILITY_END_COLUMN = 40;
const EMPLOYEE_VERSATILITY_START_INDEX = EMPLOYEE_VERSATILITY_START_COLUMN - 1;
const EMPLOYEE_VERSATILITY_END_INDEX = EMPLOYEE_VERSATILITY_END_COLUMN - 1;

function getEmployeeVersatilityColumnIndexes_(headers) {
  const start = EMPLOYEE_VERSATILITY_START_INDEX;
  const end = Math.min(EMPLOYEE_VERSATILITY_END_INDEX, headers.length - 1);
  if (end < start) return [];
  return headers
    .slice(start, end + 1)
    .map((header, offset) => ({ header: String(header || '').trim(), index: start + offset }))
    .filter(item => item.header);
}

function getEmployeeVersatilitySheet_() {
  const ss = getDatabaseSpreadsheet_();
  let sheet = EMPLOYEE_VERSATILITY_SHEET_NAMES
    .map(name => ss.getSheetByName(name))
    .find(Boolean);

  if (!sheet) {
    sheet = ss.getSheets().find(sh => /versatility/i.test(sh.getName()));
  }

  if (!sheet) {
    throw new Error('Sheet Employee Versatility tidak ditemukan. Buat tab "Employee Versatility" pada spreadsheet Portal TC.');
  }

  return { spreadsheet: ss, sheet };
}

function getEmployeeVersatilityData(token) {
  validateSession_(token, ['Administrator', 'Instruktur']);
  const source = getEmployeeVersatilitySheet_();
  const values = source.sheet.getDataRange().getDisplayValues();
  const masterEmployees = getEmployeeMasterData_();
  const masterDepartmentByNik = new Map(masterEmployees.map(emp => [String(emp.nik || '').trim(), String(emp.departemen || '').trim()]));
  if (!values.length) {
    return { headers: [], rows: [], total: 0, sheetName: source.sheet.getName(), spreadsheetName: source.spreadsheet.getName() };
  }

  const headers = values[0].map(header => String(header || '').trim());
  const indexes = Object.keys(EMPLOYEE_VERSATILITY_BASE_ALIASES).reduce((out, key) => {
    out[key] = findHeaderIndex_(headers, EMPLOYEE_VERSATILITY_BASE_ALIASES[key]);
    return out;
  }, {});

  if (indexes.nik < 0 || indexes.name < 0) {
    throw new Error('Sheet Employee Versatility wajib memiliki kolom NIK dan NAMA/NAME.');
  }

  // Hanya kolom N sampai AN yang dianggap sebagai matrix versatility.
  const equipmentIndexes = getEmployeeVersatilityColumnIndexes_(headers);

  const rows = values.slice(1)
    .map((row, rowOffset) => {
      const nik = String(row[indexes.nik] || '').trim();
      if (!nik) return null;
      const versatility = equipmentIndexes
        .map(item => {
          const numeric = Number(String(row[item.index] || '').trim());
          if (numeric !== 1 && numeric !== 2) return null;
          return { name: item.header, status: numeric === 2 ? 'UNIT' : 'SIMPER' };
        })
        .filter(Boolean);

      return {
        rowNumber: rowOffset + 2,
        nik,
        name: String(row[indexes.name] || '').trim(),
        position: indexes.position >= 0 ? String(row[indexes.position] || '').trim() : '',
        department: masterDepartmentByNik.get(nik) || '',
        versatility,
        ket: indexes.stb >= 0 ? String(row[indexes.stb] || '').trim() : ''
      };
    })
    .filter(Boolean);

  return {
    headers,
    rows,
    total: rows.length,
    sheetName: source.sheet.getName(),
    spreadsheetName: source.spreadsheet.getName()
  };
}

function updateEmployeeVersatility(token, data) {
  validateSession_(token, ['Administrator']);
  if (!data) throw new Error('Employee versatility data is required.');

  const nik = String(data.nik || '').trim();
  const name = String(data.name || '').trim();
  const position = String(data.position || '').trim();
  const department = String(data.department || '').trim();
  const ket = String(data.ket || '').trim();
  const selected = Array.isArray(data.versatility) ? data.versatility : [];

  if (!nik || !name || !position) throw new Error('NIK, Nama, dan Jabatan wajib diisi.');

  const invalidStatuses = selected.some(item => !item || !String(item.name || '').trim() || !['UNIT', 'SIMPER'].includes(String(item.status || '').trim()));
  if (invalidStatuses) throw new Error('Data versatility tidak valid.');

  const source = getEmployeeVersatilitySheet_();
  const sheet = source.sheet;
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) throw new Error('Data Employee Versatility belum tersedia.');

  const headers = values[0].map(header => String(header || '').trim());
  const nikIndex = findHeaderIndex_(headers, EMPLOYEE_VERSATILITY_BASE_ALIASES.nik);
  const nameIndex = findHeaderIndex_(headers, EMPLOYEE_VERSATILITY_BASE_ALIASES.name);
  const positionIndex = findHeaderIndex_(headers, EMPLOYEE_VERSATILITY_BASE_ALIASES.position);
  const departmentIndex = findHeaderIndex_(headers, EMPLOYEE_VERSATILITY_BASE_ALIASES.department);
  const stbIndex = findHeaderIndex_(headers, EMPLOYEE_VERSATILITY_BASE_ALIASES.stb);

  const rowIndex = values.slice(1).findIndex(row => String(row[nikIndex] || '').trim() === nik);
  if (rowIndex < 0) throw new Error('Employee dengan NIK ' + nik + ' tidak ditemukan.');

  const rowNumber = rowIndex + 2;
  const selectedMap = selected.reduce((map, item) => {
    map[String(item.name).trim().toLowerCase()] = String(item.status).trim() === 'UNIT' ? 2 : 1;
    return map;
  }, {});

  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  if (nameIndex >= 0) row[nameIndex] = name;
  if (positionIndex >= 0) row[positionIndex] = position;
  // Department/Departemen adalah master data; jangan menulisnya kembali ke tab Employee Versatility.
  if (stbIndex >= 0) row[stbIndex] = ket;

  // Hanya tulis matrix versatility pada kolom N sampai AN.
  getEmployeeVersatilityColumnIndexes_(headers).forEach(item => {
    row[item.index] = selectedMap[item.header.toLowerCase()] || 0;
  });

  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  SpreadsheetApp.flush();
  return { success: true, nik, message: 'Employee versatility berhasil diperbarui.' };
}

// ===== DOCUMENT MANAGEMENT =====
const DOCUMENT_HEADERS = [
  'DOCUMENT ID','DOCUMENT NUMBER','DOCUMENT TITLE','CATEGORY','DEPARTMENT','REVISION',
  'EFFECTIVE DATE','STATUS','GOOGLE DRIVE LINK','DESCRIPTION','CREATED BY','CREATED DATE',
  'UPDATED BY','UPDATED DATE'
];
const DOCUMENT_CATEGORIES = ['Training Modules','Forms','JSA','SOP','Work Instruction','SMKP Documents'];

function getDocumentSheet_() {
  const ss = getDatabaseSpreadsheet_();
  let sheet = ss.getSheetByName('DOCUMENT_MASTER');
  if (!sheet) sheet = ss.insertSheet('DOCUMENT_MASTER');
  const current = sheet.getRange(1, 1, 1, DOCUMENT_HEADERS.length).getDisplayValues()[0];
  const needsHeader = sheet.getLastRow() === 0 || DOCUMENT_HEADERS.some((h, i) => String(current[i] || '').trim() !== h);
  if (needsHeader) {
    sheet.getRange(1, 1, 1, DOCUMENT_HEADERS.length).setValues([DOCUMENT_HEADERS]);
    sheet.getRange(1, 1, 1, DOCUMENT_HEADERS.length).setFontWeight('bold').setBackground('#0b1f3a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getDocumentData(token, category) {
  validateSession_(token);
  const sheet = getDocumentSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { headers: DOCUMENT_HEADERS, rows: [], total: 0, category: category || '' };
  let rows = sheet.getRange(1, 1, lastRow, DOCUMENT_HEADERS.length).getDisplayValues();
  const headers = rows.shift();
  rows = rows.filter(r => r.some(v => String(v || '').trim() !== ''));
  if (category && DOCUMENT_CATEGORIES.includes(String(category))) {
    const idx = headers.indexOf('CATEGORY');
    rows = rows.filter(r => String(r[idx] || '').trim() === String(category).trim());
  }
  return { headers, rows, total: rows.length, category: category || '' };
}

function isValidDocumentLink_(url) {
  return /^https:\/\/(drive\.google\.com|docs\.google\.com|sheets\.google\.com|docs\.googleusercontent\.com)\//i.test(String(url || '').trim());
}

function validateDocumentPayload_(data) {
  if (!data) throw new Error('Document data is required.');
  [['documentNumber','Document Number'],['documentTitle','Document Title'],['category','Document Category'],['status','Document Status'],['driveLink','Google Drive Link']].forEach(([key,label]) => {
    if (!String(data[key] || '').trim()) throw new Error(label + ' is required.');
  });
  if (!DOCUMENT_CATEGORIES.includes(String(data.category).trim())) throw new Error('Invalid document category.');
  if (!['Draft','Active','Under Review','Obsolete'].includes(String(data.status).trim())) throw new Error('Invalid document status.');
  if (!isValidDocumentLink_(data.driveLink)) throw new Error('Invalid Google Drive / Google Docs link.');
}

function generateDocumentId_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'DOC-001';
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
  let max = 0;
  ids.forEach(id => { const m = String(id || '').match(/^DOC-(\d+)$/i); if (m) max = Math.max(max, Number(m[1])); });
  return 'DOC-' + String(max + 1).padStart(3, '0');
}

function getCurrentUserLabel_(token) {
  const s = validateSession_(token);
  return s.role === 'Administrator' ? 'Admin TC GPE' : s.role === 'Instruktur' ? 'Trainer TC GPE' : 'Guest';
}

function saveDocument(token, data) {
  validateSession_(token, ['Administrator']);
  validateDocumentPayload_(data);
  const sheet = getDocumentSheet_();
  const id = generateDocumentId_(sheet);
  const now = new Date();
  sheet.appendRow([
    id, String(data.documentNumber).trim(), String(data.documentTitle).trim(), String(data.category).trim(),
    String(data.department || '').trim(), String(data.revision || '').trim(), String(data.effectiveDate || '').trim(),
    String(data.status).trim(), String(data.driveLink).trim(), String(data.description || '').trim(), getCurrentUserLabel_(token), now, '', ''
  ]);
  SpreadsheetApp.flush();
  return { success: true, id, message: 'Document added successfully.' };
}

function updateDocument(token, data) {
  validateSession_(token, ['Administrator']);
  validateDocumentPayload_(data);
  const id = String(data.documentId || '').trim();
  if (!id) throw new Error('Document ID is required.');
  const sheet = getDocumentSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Document not found: ' + id);
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
  const pos = ids.findIndex(v => String(v).trim() === id);
  if (pos < 0) throw new Error('Document not found: ' + id);
  const rowNumber = pos + 2;
  const oldCreatedBy = sheet.getRange(rowNumber, 11).getDisplayValue();
  const oldCreatedDate = sheet.getRange(rowNumber, 12).getValue();
  const now = new Date();
  sheet.getRange(rowNumber, 1, 1, DOCUMENT_HEADERS.length).setValues([[
    id, String(data.documentNumber).trim(), String(data.documentTitle).trim(), String(data.category).trim(),
    String(data.department || '').trim(), String(data.revision || '').trim(), String(data.effectiveDate || '').trim(),
    String(data.status).trim(), String(data.driveLink).trim(), String(data.description || '').trim(),
    oldCreatedBy || getCurrentUserLabel_(token), oldCreatedDate || now, getCurrentUserLabel_(token), now
  ]]);
  SpreadsheetApp.flush();
  return { success: true, id, message: 'Document updated successfully.' };
}

function deleteDocument(token, documentId) {
  validateSession_(token, ['Administrator']);
  const id = String(documentId || '').trim();
  if (!id) throw new Error('Document ID is required.');
  const sheet = getDocumentSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('No documents available.');
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
  const pos = ids.findIndex(v => String(v).trim() === id);
  if (pos < 0) throw new Error('Document not found: ' + id);
  sheet.deleteRow(pos + 2);
  SpreadsheetApp.flush();
  return { success: true, message: 'Document deleted successfully.' };
}


// ===== ABOUT / TRAINING CENTER PROFILE =====
const ABOUT_CONTENT_HEADERS = ['KEY','VALUE','UPDATED BY','UPDATED DATE'];
const ABOUT_TEAM_HEADERS = ['TEAM ID','NAME','POSITION','PHOTO URL','BIO','DISPLAY ORDER','CREATED BY','CREATED DATE','UPDATED BY','UPDATED DATE'];

const ABOUT_DEFAULTS = {
  heroTitle: 'G-NEXUS',
  tagline: 'One Workforce. One Standard.',
  intro: 'GPE - Training Competency Nexus.',
  description: 'Integrated information for the GPE Training Center, competency development, and Training Center Team.',
  vision: 'Building a competent, adaptive, and safety-focused workforce.',
  mission: 'Delivering structured training, assessment, mentoring, and competency development.'
};

function getAboutSheets_() {
  const ss = getDatabaseSpreadsheet_();
  let contentSheet = ss.getSheetByName('ABOUT_CONTENT');
  let teamSheet = ss.getSheetByName('ABOUT_TEAM');

  if (!contentSheet) contentSheet = ss.insertSheet('ABOUT_CONTENT');
  if (!teamSheet) teamSheet = ss.insertSheet('ABOUT_TEAM');

  ensureSheetHeaders_(contentSheet, ABOUT_CONTENT_HEADERS);
  ensureSheetHeaders_(teamSheet, ABOUT_TEAM_HEADERS);

  return { ss, contentSheet, teamSheet };
}

function ensureSheetHeaders_(sheet, headers) {
  const current = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0]
    : [];
  const needsHeader = sheet.getLastRow() === 0 || headers.some((header, i) => String(current[i] || '').trim() !== header);
  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#0b1f3a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

function getAboutData(token) {
  validateSession_(token);
  const source = getAboutSheets_();

  const contentValues = source.contentSheet.getDataRange().getDisplayValues();
  const content = Object.assign({}, ABOUT_DEFAULTS);
  if (contentValues.length > 1) {
    contentValues.slice(1).forEach(row => {
      const key = String(row[0] || '').trim();
      if (!key) return;
      content[key] = String(row[1] || '');
    });
  }

  const teamLastRow = source.teamSheet.getLastRow();
  let teamRows = [];
  if (teamLastRow >= 2) {
    teamRows = source.teamSheet
      .getRange(2, 1, teamLastRow - 1, ABOUT_TEAM_HEADERS.length)
      .getDisplayValues()
      .filter(row => row.some(value => String(value || '').trim() !== ''))
      .map(row => ({
        id: String(row[0] || '').trim(),
        name: String(row[1] || '').trim(),
        position: String(row[2] || '').trim(),
        photoUrl: String(row[3] || '').trim(),
        bio: String(row[4] || '').trim(),
        order: Number(row[5] || 0),
        createdBy: String(row[6] || '').trim(),
        createdDate: String(row[7] || '').trim(),
        updatedBy: String(row[8] || '').trim(),
        updatedDate: String(row[9] || '').trim()
      }))
      .filter(item => item.name || item.position)
      .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));
  }

  return {
    success: true,
    content,
    team: teamRows,
    spreadsheetName: source.ss.getName(),
    contentSheetName: source.contentSheet.getName(),
    teamSheetName: source.teamSheet.getName()
  };
}

function validateAboutContent_(data) {
  if (!data) throw new Error('About content is required.');
  ['heroTitle', 'tagline', 'intro', 'description', 'vision', 'mission'].forEach(key => {
    if (!String(data[key] || '').trim()) throw new Error('About field "' + key + '" is required.');
  });
}

function saveAboutContent(token, data) {
  validateSession_(token, ['Administrator']);
  validateAboutContent_(data);
  const source = getAboutSheets_();
  const now = new Date();
  const user = getCurrentUserLabel_(token);
  const wanted = {
    heroTitle: String(data.heroTitle).trim(),
    tagline: String(data.tagline).trim(),
    intro: String(data.intro).trim(),
    description: String(data.description).trim(),
    vision: String(data.vision).trim(),
    mission: String(data.mission).trim()
  };

  const values = source.contentSheet.getDataRange().getValues();
  const existingRows = {};
  if (values.length > 1) {
    values.slice(1).forEach((row, index) => {
      const key = String(row[0] || '').trim();
      if (key) existingRows[key] = index + 2;
    });
  }

  Object.keys(wanted).forEach(key => {
    const rowNumber = existingRows[key];
    if (rowNumber) {
      source.contentSheet.getRange(rowNumber, 1, 1, 4).setValues([[key, wanted[key], user, now]]);
    } else {
      source.contentSheet.appendRow([key, wanted[key], user, now]);
    }
  });

  SpreadsheetApp.flush();
  return { success: true, message: 'About berhasil disimpan.', data: wanted };
}

function generateAboutTeamId_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'TEAM-001';
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
  let max = 0;
  ids.forEach(id => {
    const match = String(id || '').match(/^TEAM-(\d+)$/i);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return 'TEAM-' + String(max + 1).padStart(3, '0');
}

function validateTeamMember_(data) {
  if (!data) throw new Error('Team member data is required.');
  if (!String(data.name || '').trim()) throw new Error('Team member name is required.');
  if (!String(data.position || '').trim()) throw new Error('Team member position is required.');
  if (data.photoUrl && !/^https?:\/\//i.test(String(data.photoUrl).trim())) {
    throw new Error('Photo URL must be a valid HTTP/HTTPS URL.');
  }
  const order = Number(data.order);
  if (!Number.isFinite(order) || order < 0) throw new Error('Display Order must be 0 or greater.');
}

function saveTeamMember(token, data) {
  validateSession_(token, ['Administrator']);
  validateTeamMember_(data);
  const source = getAboutSheets_();
  const id = generateAboutTeamId_(source.teamSheet);
  const now = new Date();
  const user = getCurrentUserLabel_(token);
  source.teamSheet.appendRow([
    id,
    String(data.name).trim(),
    String(data.position).trim(),
    String(data.photoUrl || '').trim(),
    String(data.bio || '').trim(),
    Number(data.order || 0),
    user,
    now,
    '',
    ''
  ]);
  SpreadsheetApp.flush();
  return { success: true, id, message: 'Team member berhasil ditambahkan.' };
}

function updateTeamMember(token, data) {
  validateSession_(token, ['Administrator']);
  validateTeamMember_(data);
  const id = String(data.id || '').trim();
  if (!id) throw new Error('Team member ID is required.');

  const source = getAboutSheets_();
  const lastRow = source.teamSheet.getLastRow();
  if (lastRow < 2) throw new Error('Team member not found: ' + id);
  const ids = source.teamSheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
  const index = ids.findIndex(value => String(value || '').trim() === id);
  if (index < 0) throw new Error('Team member not found: ' + id);

  const rowNumber = index + 2;
  const current = source.teamSheet.getRange(rowNumber, 1, 1, ABOUT_TEAM_HEADERS.length).getValues()[0];
  const now = new Date();
  const user = getCurrentUserLabel_(token);

  source.teamSheet.getRange(rowNumber, 1, 1, ABOUT_TEAM_HEADERS.length).setValues([[
    id,
    String(data.name).trim(),
    String(data.position).trim(),
    String(data.photoUrl || '').trim(),
    String(data.bio || '').trim(),
    Number(data.order || 0),
    current[6] || user,
    current[7] || now,
    user,
    now
  ]]);

  SpreadsheetApp.flush();
  return { success: true, id, message: 'Team member berhasil diperbarui.' };
}

function deleteTeamMember(token, teamId) {
  validateSession_(token, ['Administrator']);
  const id = String(teamId || '').trim();
  if (!id) throw new Error('Team member ID is required.');

  const source = getAboutSheets_();
  const lastRow = source.teamSheet.getLastRow();
  if (lastRow < 2) throw new Error('No team member data available.');
  const ids = source.teamSheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
  const index = ids.findIndex(value => String(value || '').trim() === id);
  if (index < 0) throw new Error('Team member not found: ' + id);

  source.teamSheet.deleteRow(index + 2);
  SpreadsheetApp.flush();
  return { success: true, message: 'Team member berhasil dihapus.' };
}
