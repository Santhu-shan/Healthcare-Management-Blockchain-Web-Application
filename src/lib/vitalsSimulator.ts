import { VITAL_THRESHOLDS } from '@/types';

// Generate realistic vital signs with occasional anomalies
export function generateVitals(): {
  heart_rate: number;
  temperature: number;
  spo2: number;
  status: 'NORMAL' | 'ALERT';
  alertDetails?: { type: string; severity: 'warning' | 'critical'; message: string }[];
} {
  // Random chance of anomaly (15% chance)
  const hasAnomaly = Math.random() < 0.15;
  
  let heart_rate: number;
  let temperature: number;
  let spo2: number;
  
  if (hasAnomaly) {
    // Generate abnormal values
    const anomalyType = Math.floor(Math.random() * 3);
    
    switch (anomalyType) {
      case 0: // Abnormal heart rate
        heart_rate = Math.random() < 0.5 
          ? randomInRange(40, 55) // Bradycardia
          : randomInRange(105, 140); // Tachycardia
        temperature = randomInRange(36.2, 37.0);
        spo2 = randomInRange(96, 99);
        break;
      case 1: // Fever
        heart_rate = randomInRange(75, 95);
        temperature = randomInRange(37.5, 39.5);
        spo2 = randomInRange(95, 98);
        break;
      case 2: // Low SpO2
        heart_rate = randomInRange(85, 100);
        temperature = randomInRange(36.3, 37.0);
        spo2 = randomInRange(88, 94);
        break;
      default:
        heart_rate = randomInRange(65, 85);
        temperature = randomInRange(36.3, 36.8);
        spo2 = randomInRange(97, 99);
    }
  } else {
    // Generate normal values
    heart_rate = randomInRange(65, 85);
    temperature = randomInRange(36.3, 36.8);
    spo2 = randomInRange(97, 99);
  }
  
  // Round values appropriately
  heart_rate = Math.round(heart_rate);
  temperature = Math.round(temperature * 10) / 10;
  spo2 = Math.round(spo2);
  
  // Intelligent health check
  const { status, alertDetails } = checkVitalStatus(heart_rate, temperature, spo2);
  
  return { heart_rate, temperature, spo2, status, alertDetails };
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Intelligent health check algorithm
export function checkVitalStatus(
  heart_rate: number,
  temperature: number,
  spo2: number
): { status: 'NORMAL' | 'ALERT'; alertDetails: { type: string; severity: 'warning' | 'critical'; message: string }[] } {
  const alertDetails: { type: string; severity: 'warning' | 'critical'; message: string }[] = [];
  
  // Heart rate check
  if (heart_rate < VITAL_THRESHOLDS.heart_rate.min) {
    const severity = heart_rate < 50 ? 'critical' : 'warning';
    alertDetails.push({
      type: 'HEART_RATE_LOW',
      severity,
      message: `Bradycardia detected: ${heart_rate} ${VITAL_THRESHOLDS.heart_rate.unit} (Normal: ${VITAL_THRESHOLDS.heart_rate.min}-${VITAL_THRESHOLDS.heart_rate.max})`,
    });
  } else if (heart_rate > VITAL_THRESHOLDS.heart_rate.max) {
    const severity = heart_rate > 120 ? 'critical' : 'warning';
    alertDetails.push({
      type: 'HEART_RATE_HIGH',
      severity,
      message: `Tachycardia detected: ${heart_rate} ${VITAL_THRESHOLDS.heart_rate.unit} (Normal: ${VITAL_THRESHOLDS.heart_rate.min}-${VITAL_THRESHOLDS.heart_rate.max})`,
    });
  }
  
  // Temperature check
  if (temperature < VITAL_THRESHOLDS.temperature.min) {
    const severity = temperature < 35 ? 'critical' : 'warning';
    alertDetails.push({
      type: 'TEMPERATURE_LOW',
      severity,
      message: `Hypothermia risk: ${temperature}${VITAL_THRESHOLDS.temperature.unit} (Normal: ${VITAL_THRESHOLDS.temperature.min}-${VITAL_THRESHOLDS.temperature.max})`,
    });
  } else if (temperature > VITAL_THRESHOLDS.temperature.max) {
    const severity = temperature > 38.5 ? 'critical' : 'warning';
    alertDetails.push({
      type: 'TEMPERATURE_HIGH',
      severity,
      message: `Fever detected: ${temperature}${VITAL_THRESHOLDS.temperature.unit} (Normal: ${VITAL_THRESHOLDS.temperature.min}-${VITAL_THRESHOLDS.temperature.max})`,
    });
  }
  
  // SpO2 check
  if (spo2 < VITAL_THRESHOLDS.spo2.min) {
    const severity = spo2 < 90 ? 'critical' : 'warning';
    alertDetails.push({
      type: 'SPO2_LOW',
      severity,
      message: `Low oxygen saturation: ${spo2}${VITAL_THRESHOLDS.spo2.unit} (Normal: ${VITAL_THRESHOLDS.spo2.min}-${VITAL_THRESHOLDS.spo2.max})`,
    });
  }
  
  const status = alertDetails.length > 0 ? 'ALERT' : 'NORMAL';
  
  return { status, alertDetails };
}

// Generate initial patient data
export function generatePatientData(): { name: string; age: number; gender: string; room_number: string; diagnosis: string }[] {
  const firstNames = ['John', 'Mary', 'James', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson'];
  const diagnoses = [
    'Post-operative monitoring',
    'Cardiac arrhythmia observation',
    'Respiratory infection',
    'Diabetes management',
    'Hypertension monitoring',
    'Post-surgical recovery',
    'Pneumonia treatment',
    'Chronic heart failure',
    'Acute bronchitis',
    'Dehydration treatment',
    'General health check',
    'Fever investigation',
  ];
  
  const patients: { name: string; age: number; gender: string; room_number: string; diagnosis: string }[] = [];
  
  for (let i = 0; i < 12; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = Math.random() < 0.5 ? 'Male' : 'Female';
    const age = Math.floor(Math.random() * 60) + 20;
    const floor = Math.floor(i / 4) + 1;
    const room = (i % 4) + 1;
    
    patients.push({
      name: `${firstName} ${lastName}`,
      age,
      gender,
      room_number: `${floor}0${room}`,
      diagnosis: diagnoses[Math.floor(Math.random() * diagnoses.length)],
    });
  }
  
  return patients;
}
