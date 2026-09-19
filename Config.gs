const APP_CONFIG = {
  appName: 'G-NEXUS',
  fullName: 'GPE - Training Competency Nexus',
  tagline: 'One Workforce. One Standard.',
  companyName: 'PT Graha Prima Energy',
  version: 'Prototype V1',
  theme: 'Clean Corporate Sidebar - Dark Blue',
  defaultRole: 'Administrator',
  roles: ['Administrator', 'Instruktur', 'Guest']
};

const TRAINING_PROGRAM_TYPES = [
  'Green Training',
  'Multi Skill Training',
  'Skill Up Training',
  'Similar Training',
  'Add Versatility Type Moving',
  'Add Versatility Type Full'
];

const TRAINING_JOBSITES = ['GAM', 'JO-IC'];

const TRAINING_UNITS = [
  'Excavator', 'Motor Grader', 'Bulldozer', 'Compactor', 'Heavy Dump', 'Lowboy',
  'Trailer', 'Dump Truck', 'Lube Truck', 'Fuel Truck', 'Water Truck', 'Crane Truck',
  'Off Highway Truck'
];

const TRAINING_VERSATILITY_OPTIONS = [
  'DT Volvo FMX 370','DT Volvo FMX 400','DT Volvo FMX 420','DT Volvo FMX 370,400,420','DT Volvo FMX 400,420',
  'DT Hino 300','DT Hino 500','DT Hino 300,500','FT Hino 500','FT Trailer Volvo FH 16 550','WT Hino 500',
  'LT Hino 300','LT Hino 500','LT Volvo FMX 370','LT Volvo FMX 440','LT Hino 300,500','LT Volvo FMX 370,440',
  'Compact SV 525D','Compact BW 211D','Compact SV 525D, BW 211D','HD Komatsu 465','HD Komatsu 785','OHT CAT 773',
  'HD Komatsu 465, OHT CAT 773','HD Komatsu 465,785','Crane Truck Hino 500','Lowboy Volvo FH16 550 - 80 T',
  'Lowboy Volvo FH16 540 - 120 T','Lowboy Volvo FH16 550 - 80 T, FH16 540 - 120 T','Excavator PC 200/210','Excavator PC 400',
  'Excavator PC 800','Excavator PC 1250','Excavator HIT ZX 350','Excavator HIT ZX 470','Excavator HIT ZX 870',
  'Excavator HIT ZX 1200','Excavator HIT ZX 350,400, Excavator PC 400','Excavator HIT ZX 870, Excavator PC 800',
  'Excavator HIT ZX 1200, Excavator PC 1250','Excavator HIT ZX 870,1200, Excavator PC 800,1250','MG Komatsu 535',
  'MG Komatsu 705','MG Komatsu 755','MG Komatsu 825','MG Komatsu 535,705','MG Komatsu 535,755','MG Komatsu 705,755',
  'MG Komatsu 535,705,755','DZ D85ESS','DZ D6','DZ D155A','DZ D8','DZ D9','DZ D85ESS,D6','DZ D155A,D8',
  'DZ D85ESS,D155A','DZ D6,D8','DZ D6,D155A,D8'
];

const TRAINING_INITIAL_VERSATILITY_OPTIONS = [
  'Non-Skill',
  'PC KOM 200/210','PC KOM 400','PC KOM 800','PC KOM 1250','HIT ZX 350','HIT ZX 470','HIT ZX 870','HIT ZX 1200',
  'MG KOMATSU 535','MG KOMATSU 705','MG KOMATSU 755','MG KOMATSU 825',
  'DZ D85ESS','DZ D6','DZ D8','DZ D9','DZ D155A',
  'CP SV 525D','CP BW 211D',
  'HD KOM 465','HD KOM 785','OHT CAT 773',
  'DT VOLVO FMX 370','DT VOLVO FMX 400','DT VOLVO FMX 420','DT HINO 300','DT HINO 500',
  'WT HINO 500','FT HINO 500','FT TRAILER VOLVO FH16 550',
  'LT HINO 300','LT HINO 500','LT VOLVO FMX 370','LT VOLVO FMX 440',
  'CT HINO 500','LOWBOY FH16 550 - 80 T','LOWBOY FH16 540 - 120 T'
];

const TRAINING_PIC_OPTIONS = [
  'Regen Tolanda','Helbin PS','Asep Setyabudi Hanora','Catur Herdian Joko Lelono','Hasim',
  'Dhimas Maychel','Ricki Supriyanto','Juni','Demma Massolo','Didik Setiawan'
];

const TRAINING_REMARKS = [
  'Inclass','Training Praktek 1','Training Praktek 2','On Job Training','Probation',
  "Re’assesment",'Close','Hold','Cancel'
];
