const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Random generators
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 1) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

async function fixDoctors() {
  console.log("Analyzing Doctors...");
  const { data: doctors, error } = await supabase.from('profiles').select('*').eq('role', 'doctor');
  if (error) throw error;
  
  for (const doc of doctors) {
    const updates = {};
    if (!doc.first_name) updates.first_name = getRandomItem(firstNames);
    if (!doc.last_name) updates.last_name = getRandomItem(lastNames);
    if (!doc.specialty) updates.specialty = getRandomItem(['Cardiologist', 'Endocrinologist', 'General Practitioner', 'Neurologist', 'Nephrologist']);
    if (!doc.consultation_fee) updates.consultation_fee = getRandomInt(100, 500);
    if (!doc.contact_number) updates.contact_number = `+1-555-${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`;
    if (!doc.availability_status) updates.availability_status = 'available';
    
    if (Object.keys(updates).length > 0) {
      console.log(`Updating doctor ${doc.id} with`, updates);
      await supabase.from('profiles').update(updates).eq('id', doc.id);
    }
  }
}

async function fixPatients() {
  console.log("Analyzing Patients...");
  const { data: patients, error } = await supabase.from('patients').select('id, demographics, mrn');
  if (error) {
    console.error("Error fetching patients:", error);
    return;
  }
  console.log(`Found ${patients ? patients.length : 0} patients`);
  
  for (const pat of patients) {
    let d = pat.demographics || {};
    let updated = false;
    
    if (!d.first_name) { d.first_name = getRandomItem(firstNames); updated = true; }
    if (!d.last_name) { d.last_name = getRandomItem(lastNames); updated = true; }
    if (!d.age) { d.age = getRandomInt(20, 85); updated = true; }
    if (!d.gender) { d.gender = getRandomItem(['Male', 'Female']); updated = true; }
    if (!d.contact_number) { d.contact_number = `+1-555-${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`; updated = true; }
    
    if (updated) {
      console.log(`Updating patient ${pat.id} demographics`);
      await supabase.from('patients').update({ demographics: d }).eq('id', pat.id);
    }

    // Check vitals
    const { data: vitals } = await supabase.from('vitals').select('id').eq('patient_id', pat.id);
    if (!vitals || vitals.length === 0) {
      console.log(`Adding vitals for patient ${pat.id}`);
      await supabase.from('vitals').insert([
        { patient_id: pat.id, type: 'BMI', value: getRandomFloat(18.5, 35.0, 1).toString(), unit: 'kg/m2' },
        { patient_id: pat.id, type: 'Blood Pressure Systolic', value: getRandomInt(110, 160).toString(), unit: 'mmHg' }
      ]);
    }

    // Check lab results
    const { data: labs } = await supabase.from('lab_results').select('id').eq('patient_id', pat.id);
    if (!labs || labs.length === 0) {
      console.log(`Adding labs for patient ${pat.id}`);
      await supabase.from('lab_results').insert([
        { patient_id: pat.id, test_name: 'HbA1c', value: getRandomFloat(4.5, 8.5, 1).toString(), unit: '%' },
        { patient_id: pat.id, test_name: 'Cholesterol', value: getRandomInt(150, 260).toString(), unit: 'mg/dL' }
      ]);
    }

    // Check predictions
    const { data: preds } = await supabase.from('predictions').select('id').eq('patient_id', pat.id);
    if (!preds || preds.length === 0) {
      console.log(`Adding prediction for patient ${pat.id}`);
      const prob = getRandomFloat(0.1, 0.9, 2);
      let severity = 'Low';
      if (prob > 0.75) severity = 'Critical';
      else if (prob > 0.5) severity = 'High';
      else if (prob > 0.25) severity = 'Moderate';

      await supabase.from('predictions').insert([
        { 
          patient_id: pat.id, 
          disease: 'Diabetes', 
          probability: prob, 
          severity: severity, 
          confidence: getRandomFloat(0.8, 0.99, 2) 
        }
      ]);
    }
  }
}

async function run() {
  try {
    await fixDoctors();
    await fixPatients();
    console.log("Data fill complete!");
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
