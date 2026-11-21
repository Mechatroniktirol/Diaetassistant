<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Einfacher Diät-Assistent</title>
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#10b981">
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { margin: 0; padding: 20px; background: #f3f4f6; color: #1f2937; display: flex; flex-direction: column; align-items: center; }
    .container { width: 100%; max-width: 450px; background: white; padding: 24px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
    h1 { font-size: 24px; text-align: center; margin-top: 0; }
    .hidden { display: none !important; }
    label { display: block; font-weight: 600; margin-top: 14px; font-size: 14px; }
    input, select { width: 100%; padding: 12px; margin-top: 6px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; }
    .btn { width: 100%; padding: 16px; margin-top: 20px; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; }
    .btn-primary { background: #10b981; color: white; }
    .btn-secondary { background: #e5e7eb; color: #374151; font-size: 14px; padding: 10px; margin-top: 12px; }
    .camera-box { border: 2px dashed #10b981; border-radius: 16px; padding: 30px 20px; text-align: center; margin-top: 20px; cursor: pointer; background: #ecfdf5; }
    .camera-box span { font-size: 48px; display: block; margin-bottom: 10px; }
    #preview { width: 100%; max-height: 260px; object-fit: cover; border-radius: 12px; margin-top: 15px; }
    .result-card { margin-top: 20px; padding: 25px; border-radius: 16px; text-align: center; color: white; }
    .bg-green { background: #10b981; }
    .bg-yellow { background: #f59e0b; color: #111827; }
    .bg-red { background: #ef4444; }
    .result-title { font-size: 30px; font-weight: 800; margin: 10px 0; }
    .result-sub { font-size: 16px; opacity: 0.9; margin: 0; }
    .loader { text-align: center; margin-top: 20px; font-weight: bold; color: #10b981; font-size: 18px; }
  </style>
</head>
<body>

<div class="container">
  <h1>🍽️ Diät-Assistent</h1>

  <!-- SCREEN 1: SETUP -->
  <div id="setup-screen">
    <p style="text-align:center; color:#6b7280; font-size:14px;">Gib einmalig deine Daten ein, damit die App weiß, wie viel du essen darfst.</p>
    <label>Geschlecht</label>
    <select id="gender">
      <option value="m">Männlich</option>
      <option value="w">Weiblich</option>
    </select>
    <label>Alter (Jahre)</label>
    <input type="number" id="age" value="35">
    <label>Größe (cm)</label>
    <input type="number" id="height" value="178">
    <label>Aktuelles Gewicht (kg)</label>
    <input type="number" id="weight" value="90">
    <label>Mahlzeiten pro Tag</label>
    <select id="meals">
      <option value="2">2 Mahlzeiten</option>
      <option value="3" selected>3 Mahlzeiten (Standard)</option>
      <option value="4">4 Mahlzeiten</option>
    </select>
    <label>Ollama Server-IP</label>
    <input type="text" id="ollama-ip" value="127.0.0.1">
    <button class="btn btn-primary" onclick="saveProfile()">Speichern & Starten</button>
  </div>

  <!-- SCREEN 2: HAUPTANSICHT -->
  <div id="main-screen" class="hidden">
    <div style="background:#f9fafb; padding:10px; border-radius:10px; text-align:center; font-size:14px;">
      Dein Budget pro Mahlzeit: <strong id="budget-display">600</strong> <strong>kcal</strong>
    </div>

    <input type="file" id="camera-input" accept="image/*" capture="environment" class="hidden" onchange="handleImage(event)">
    
    <div class="camera-box" onclick="document.getElementById('camera-input').click()">
      <span>📸</span>
      <strong>Mahlzeit auswählen / fotografieren</strong>
      <div style="font-size:13px; color:#6b7280; margin-top:4px;">Hier klicken, um Bild zu wählen</div>
    </div>

    <img id="preview" class="hidden" alt="Vorschau">
    <div id="loader" class="loader hidden">⏳ KI prüft deinen Teller...</div>
    
    <div id="result-box" class="result-card hidden">
      <p class="result-sub" id="res-food">Erkannt: Schnitzel</p>
      <div class="result-title" id="res-text">Iss genau die Hälfte!</div>
      <p class="result-sub" id="res-percent">(ca. 50 % der Portion)</p>
    </div>

    <button class="btn btn-secondary" onclick="showSetup()">⚙️ Meine Daten ändern</button>
  </div>
</div>

<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }

  window.onload = () => {
    const saved = localStorage.getItem('dietProfile');
    if (saved) {
      const data = JSON.parse(saved);
      document.getElementById('gender').value = data.gender;
      document.getElementById('age').value = data.age;
      document.getElementById('height').value = data.height;
      document.getElementById('weight').value = data.weight;
      document.getElementById('meals').value = data.meals;
      document.getElementById('ollama-ip').value = data.ip || '127.0.0.1';
      showMain(data.budget);
    }
  };

  function saveProfile() {
    const gender = document.getElementById('gender').value;
    const age = parseFloat(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const meals = parseInt(document.getElementById('meals').value);
    const ip = document.getElementById('ollama-ip').value.trim() || '127.0.0.1';

    let bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'm' ? 5 : -161);
    let dailyCalories = Math.max(1200, (bmr * 1.35) - 500);
    let budget = Math.round(dailyCalories / meals);

    const profile = { gender, age, height, weight, meals, ip, budget };
    localStorage.setItem('dietProfile', JSON.stringify(profile));
    showMain(budget);
  }

  function showMain(budget) {
    document.getElementById('budget-display').innerText = budget;
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
  }

  function showSetup() {
    document.getElementById('main-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
  }

  function handleImage(event) {
    const file = event.target.files.item(0);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const preview = document.getElementById('preview');
        preview.src = resizedDataUrl;
        preview.classList.remove('hidden');

        const base64Image = resizedDataUrl.split(',').pop();
        analyzeWithOllama(base64Image);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function analyzeWithOllama(base64Image) {
    const profile = JSON.parse(localStorage.getItem('dietProfile'));
    const loader = document.getElementById('loader');
    const resultBox = document.getElementById('result-box');

    loader.classList.remove('hidden');
    resultBox.classList.add('hidden');

    const prompt = `Erlaubtes Kalorienbudget für diese Mahlzeit: ${profile.budget} kcal.
Schätze die Gesamtkalorien des Essens auf dem Foto (inklusive 15% Puffer für versteckte Fette).
Berechne, wie viel Prozent der Portion in das Budget von ${profile.budget} kcal passen (maximal 100%).
Antworte AUSSCHLIESSLICH als JSON mit genau diesen 3 Feldern:
- "gericht": Kurzer Name des Essens (z.B. "Schnitzel mit Pommes")
- "prozent": Zahl zwischen 10 und 100
- "ansage": Eine extrem einfache Handlungsanweisung ohne Kalorienzahlen (z.B. "Iss alles auf!", "Iss genau die Hälfte!", "Iss nur ein Drittel davon!")`;

    try {
      const response = await fetch(`http://${profile.ip}:11434/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3.5:4b',
          messages: [{
            role: 'user',
            content: prompt,
            images: [base64Image]
          }],
          format: 'json',
          think: false,
          stream: false
        })
      });

      const data = await response.json();
      const result = JSON.parse(data.message.content);

      const prozent = parseInt(result.prozent) || 50;
      document.getElementById('res-food').innerText = `Erkannt: ${result.gericht || 'Mahlzeit'}`;
      document.getElementById('res-text').innerText = result.ansage || 'Iss die Hälfte davon!';
      document.getElementById('res-percent').innerText = `(ca. ${prozent} % der Portion)`;

      resultBox.className = 'result-card';
      if (prozent >= 85) resultBox.classList.add('bg-green');
      else if (prozent >= 45) resultBox.classList.add('bg-yellow');
      else resultBox.classList.add('bg-red');

      resultBox.classList.remove('hidden');
    } catch (error) {
      alert("Fehler bei der Verbindung zu Ollama! Prüfe ob Ollama läuft.\nDetails: " + error.message);
    } finally {
      loader.classList.add('hidden');
    }
  }
</script>

</body>
</html>
