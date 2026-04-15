// ======================
// 🌌 ANIMASI BINTANG
// ======================
const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let stars = [];

for (let i = 0; i < 120; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2,
        s: Math.random() * 0.5
    });
}

function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";

    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();

        star.y += star.s;
        if (star.y > canvas.height) star.y = 0;
    });

    requestAnimationFrame(drawStars);
}
drawStars();


// ======================
// 📍 AUTO LOKASI
// ======================
function ambilLokasi() {
    navigator.geolocation.getCurrentPosition(pos => {
        document.getElementById("lat").value = pos.coords.latitude.toFixed(4);
        document.getElementById("lng").value = pos.coords.longitude.toFixed(4);
    });
}


// ======================
// 🔢 UTIL
// ======================
function deg2rad(d){ return d*Math.PI/180; }
function rad2deg(r){ return r*180/Math.PI; }

function julianDay(date){
    return (date/86400000)+2440587.5;
}


// ======================
// ☀️ POSISI MATAHARI
// ======================
function sunPosition(d){
    let L = (280.46 + 0.9856474*d) % 360;
    let g = (357.528 + 0.9856003*d) % 360;

    let lambda = L + 1.915*Math.sin(deg2rad(g)) + 0.020*Math.sin(2*deg2rad(g));
    let epsilon = 23.439 - 0.0000004*d;

    let RA = rad2deg(Math.atan2(
        Math.cos(deg2rad(epsilon))*Math.sin(deg2rad(lambda)),
        Math.cos(deg2rad(lambda))
    ));

    let Dec = rad2deg(Math.asin(
        Math.sin(deg2rad(epsilon))*Math.sin(deg2rad(lambda))
    ));

    return {RA, Dec};
}


// ======================
// 🌙 POSISI BULAN
// ======================
function moonPosition(d){
    let L = (218.32 + 13.176396*d) % 360;
    let M = (134.9 + 13.064993*d) % 360;
    let F = (93.3 + 13.229350*d) % 360;

    let lambda = L + 6.289*Math.sin(deg2rad(M));
    let beta = 5.128*Math.sin(deg2rad(F));

    let epsilon = 23.439 - 0.0000004*d;

    let RA = rad2deg(Math.atan2(
        Math.sin(deg2rad(lambda))*Math.cos(deg2rad(epsilon)) -
        Math.tan(deg2rad(beta))*Math.sin(deg2rad(epsilon)),
        Math.cos(deg2rad(lambda))
    ));

    let Dec = rad2deg(Math.asin(
        Math.sin(deg2rad(beta))*Math.cos(deg2rad(epsilon)) +
        Math.cos(deg2rad(beta))*Math.sin(deg2rad(epsilon))*Math.sin(deg2rad(lambda))
    ));

    return {RA, Dec};
}


// ======================
// 🌍 WAKTU MAGHRIB REAL
// ======================
function waktuMaghrib(lat, decSun){
    lat = deg2rad(lat);
    decSun = deg2rad(decSun);

    let h = deg2rad(-0.833); // standar sunset

    let cosH = (Math.sin(h) - Math.sin(lat)*Math.sin(decSun)) /
               (Math.cos(lat)*Math.cos(decSun));

    let H = Math.acos(cosH);

    return rad2deg(H); // Hour angle sunset
}


// ======================
// 🌍 ALTITUDE
// ======================
function altitude(lat, dec, HA){
    lat = deg2rad(lat);
    dec = deg2rad(dec);
    HA = deg2rad(HA);

    return rad2deg(Math.asin(
        Math.sin(lat)*Math.sin(dec) +
        Math.cos(lat)*Math.cos(dec)*Math.cos(HA)
    ));
}


// ======================
// 🌙 HISAB FINAL
// ======================
let chartInstance = null;

function hitung(){
    const lat = parseFloat(document.getElementById("lat").value);
    const tanggal = new Date(document.getElementById("tanggal").value);

    const hasil = document.getElementById("hasil");

    let jd = julianDay(tanggal);
    let d = jd - 2451545.0;

    let sun = sunPosition(d);
    let moon = moonPosition(d);

    // 🌗 elongasi
    let elongasi = Math.acos(
        Math.sin(deg2rad(sun.Dec))*Math.sin(deg2rad(moon.Dec)) +
        Math.cos(deg2rad(sun.Dec))*Math.cos(deg2rad(moon.Dec)) *
        Math.cos(deg2rad(sun.RA - moon.RA))
    );
    elongasi = rad2deg(elongasi);

    // 🌇 maghrib real
    let HA_sunset = waktuMaghrib(lat, sun.Dec);

    // 🌙 tinggi hilal saat maghrib
    let altHilal = altitude(lat, moon.Dec, HA_sunset);

    // Kriteria MABIMS
    let status = "";
    if(altHilal >= 3 && elongasi >= 6.4){
        status = "✅ Hilal Terlihat";
    } else {
        status = "❌ Hilal Tidak Terlihat";
    }

    hasil.innerHTML = `
        <h3>Hisab Hilal </h3>
        <p>📅 ${tanggal.toDateString()}</p>
        <p>🌙 Tinggi Hilal: ${altHilal.toFixed(2)}°</p>
        <p>🌗 Elongasi: ${elongasi.toFixed(2)}°</p>
        <p>🌇 Sudut Maghrib (HA): ${HA_sunset.toFixed(2)}°</p>
        <p><b>${status}</b></p>
    `;

    hasil.classList.add("show");

    tampilChart(altHilal);
}


// ======================
// 📊 CHART
// ======================
function tampilChart(alt){
    const ctx = document.getElementById("chart");

    if(chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Maghrib','+10m','+20m','+30m'],
            datasets: [{
                label: 'Ketinggian Hilal (°)',
                data: [alt, alt+1, alt+2, alt+1.5],
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            plugins: {
                legend: { labels: { color: "white" } }
            },
            scales: {
                x: { ticks: { color: "white" } },
                y: { ticks: { color: "white" } }
            }
        }
    });
}