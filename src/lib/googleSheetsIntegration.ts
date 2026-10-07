/**
 * Google Apps Script Web App Template for Patas Net
 * 
 * PETUNJUK PEMASANGAN DI GOOGLE SPREADSHEET:
 * 1. Buat Google Spreadsheet baru di Google Drive Anda (beri nama misal: "Database Patas Net WiFi").
 * 2. Buat 3 Sheet (Tab):
 *    - "Pelanggan"
 *    - "Pembayaran"
 *    - "Tiket"
 * 3. Klik menu "Extensions" (Ekstensi) > "Apps Script".
 * 4. Hapus seluruh kode default di Code.gs, lalu paste seluruh kode di bawah ini.
 * 5. Klik "Deploy" (Terapkan) > "New deployment" (Penerapan baru).
 * 6. Pilih tipe: "Web app" (Aplikasi Web).
 * 7. Setting:
 *    - Description: "Patas Net Web App API"
 *    - Execute as: "Me" (Saya)
 *    - Who has access: "Anyone" (Siapa saja, bahkan anonim)
 * 8. Klik Deploy & berikan otorisasi izin Google Drive & Sheets.
 * 9. Salin "Web App URL" (berakhiran /exec) dan tempel ke Dashboard Admin Patas Net pada tab "Google Sheets & Drive".
 */

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script Web App - Backend Database Patas Net WiFi
 * Otomatis sinkronisasi data pelanggan ke Google Sheet dan foto KTP/Bukti Bayar ke Google Drive
 */

function setupHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet 1: Pelanggan
  var sheetPelanggan = ss.getSheetByName("Pelanggan") || ss.insertSheet("Pelanggan");
  if (sheetPelanggan.getLastRow() === 0) {
    sheetPelanggan.appendRow([
      "Timestamp", "ID Pelanggan", "Nama Lengkap", "Email", "Nomor WhatsApp", 
      "Alamat Lengkap", "Koordinat GPS", "Paket WiFi", "Status", "URL Foto KTP Drive"
    ]);
    sheetPelanggan.getRange("A1:J1").setFontWeight("bold").setBackground("#2563eb").setFontColor("#ffffff");
  }

  // Sheet 2: Pembayaran
  var sheetPembayaran = ss.getSheetByName("Pembayaran") || ss.insertSheet("Pembayaran");
  if (sheetPembayaran.getLastRow() === 0) {
    sheetPembayaran.appendRow([
      "Timestamp", "ID Pembayaran", "ID Pelanggan", "Nama Pelanggan", 
      "Nominal (Rp)", "Periode Tagihan", "Metode", "Status", "URL Bukti Bayar Drive"
    ]);
    sheetPembayaran.getRange("A1:I1").setFontWeight("bold").setBackground("#10b981").setFontColor("#ffffff");
  }

  // Sheet 3: Tiket
  var sheetTiket = ss.getSheetByName("Tiket") || ss.insertSheet("Tiket");
  if (sheetTiket.getLastRow() === 0) {
    sheetTiket.appendRow([
      "Timestamp", "ID Tiket", "ID Pelanggan", "Nama", "Nomor WA", "Pesan Masalah", "Status"
    ]);
    sheetTiket.getRange("A1:G1").setFontWeight("bold").setBackground("#f59e0b").setFontColor("#ffffff");
  }
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = DriveApp.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

function saveBase64ToDrive(base64String, fileName, folderName) {
  try {
    if (!base64String || !base64String.includes(",")) return "";
    var folder = getOrCreateFolder(folderName);
    var parts = base64String.split(",");
    var mime = parts[0].split(":")[1].split(";")[0];
    var data = Utilities.base64Decode(parts[1]);
    var blob = Utilities.newBlob(data, mime, fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileId = file.getId();
    // Return direct image link that can be displayed immediately in <img> tags
    return "https://lh3.googleusercontent.com/d/" + fileId;
  } catch (err) {
    return "";
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPelanggan = ss.getSheetByName("Pelanggan");
    var sheetPembayaran = ss.getSheetByName("Pembayaran");
    var sheetTiket = ss.getSheetByName("Tiket");

    var customers = [];
    if (sheetPelanggan && sheetPelanggan.getLastRow() > 1) {
      var data = sheetPelanggan.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[1]) {
          var coords = [-6.2088, 106.8456];
          if (row[6] && String(row[6]).indexOf(",") !== -1) {
            var parts = String(row[6]).split(",");
            coords = [parseFloat(parts[0]), parseFloat(parts[1])];
          }
          customers.push({
            id: String(row[1]),
            name: String(row[2]),
            email: String(row[3]),
            phone: String(row[4]),
            address: String(row[5]),
            coordinates: coords,
            packageId: String(row[7]),
            status: String(row[8] || "active").toLowerCase(),
            ktpImageUrl: String(row[9] || ""),
            createdAt: row[0] ? new Date(row[0]).toISOString() : new Date().toISOString(),
            payments: []
          });
        }
      }
    }

    // Attach payments
    if (sheetPembayaran && sheetPembayaran.getLastRow() > 1) {
      var payData = sheetPembayaran.getDataRange().getValues();
      for (var j = 1; j < payData.length; j++) {
        var pRow = payData[j];
        var custId = String(pRow[2]);
        var cust = customers.find(function(c) { return c.id === custId; });
        if (cust) {
          cust.payments.push({
            id: String(pRow[1]),
            date: pRow[0] ? Utilities.formatDate(new Date(pRow[0]), Session.getScriptTimeZone(), "yyyy-MM-dd") : "",
            amount: Number(pRow[4]) || 0,
            billingPeriod: String(pRow[5] || "Tagihan Berjalan"),
            method: String(pRow[6] || "Transfer Bank"),
            status: String(pRow[7] || "unpaid").toLowerCase(),
            proofOfPaymentUrl: String(pRow[8] || "")
          });
        }
      }
    }

    var tickets = [];
    if (sheetTiket && sheetTiket.getLastRow() > 1) {
      var tData = sheetTiket.getDataRange().getValues();
      for (var k = 1; k < tData.length; k++) {
        var tRow = tData[k];
        if (tRow[1]) {
          tickets.push({
            id: String(tRow[1]),
            userId: String(tRow[2]),
            userName: String(tRow[3]),
            phone: String(tRow[4]),
            message: String(tRow[5]),
            status: String(tRow[6] || "open").toLowerCase(),
            date: tRow[0] ? Utilities.formatDate(new Date(tRow[0]), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm") : ""
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      customers: customers,
      tickets: tickets,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    setupHeaders();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "subscribe";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "subscribe") {
      var sheet = ss.getSheetByName("Pelanggan");
      var ktpUrl = "";
      if (payload.ktpImageBase64) {
        ktpUrl = saveBase64ToDrive(payload.ktpImageBase64, "KTP_" + payload.name + "_" + payload.id + ".jpg", "PatasNet_Drive_KTP");
      }
      
      sheet.appendRow([
        new Date(),
        payload.id || ("TR-" + Math.floor(1000 + Math.random() * 9000)),
        payload.name || "",
        payload.email || "",
        payload.phone || "",
        payload.address || "",
        payload.coordinates ? payload.coordinates.join(", ") : "",
        payload.packageId || "home-20m",
        payload.status || "pending",
        ktpUrl
      ]);

      // Buat tagihan awal otomatis di sheet Pembayaran
      var sheetPay = ss.getSheetByName("Pembayaran");
      var payId = "PAY-" + Math.floor(7000 + Math.random() * 9000);
      sheetPay.appendRow([
        new Date(),
        payId,
        payload.id,
        payload.name,
        payload.amount || 170000,
        "Bulan Pertama",
        "QRIS / Transfer",
        "unpaid",
        ""
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Data pelanggan berhasil disimpan di Google Sheet & Google Drive!",
        ktpUrl: ktpUrl,
        id: payload.id
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "submit_payment_proof") {
      var sheetPay = ss.getSheetByName("Pembayaran");
      var proofUrl = "";
      if (payload.proofBase64) {
        proofUrl = saveBase64ToDrive(payload.proofBase64, "BUKTI_" + payload.userId + "_" + payload.paymentId + ".jpg", "PatasNet_Drive_BuktiBayar");
      }

      var data = sheetPay.getDataRange().getValues();
      var updated = false;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(payload.paymentId)) {
          sheetPay.getRange(i + 1, 8).setValue("pending_verification");
          if (proofUrl) sheetPay.getRange(i + 1, 9).setValue(proofUrl);
          if (payload.method) sheetPay.getRange(i + 1, 7).setValue(payload.method);
          updated = true;
          break;
        }
      }
      if (!updated) {
        sheetPay.appendRow([
          new Date(),
          payload.paymentId,
          payload.userId,
          payload.userName || "",
          payload.amount || 0,
          payload.billingPeriod || "Berjalan",
          payload.method || "Transfer",
          "pending_verification",
          proofUrl
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Bukti pembayaran tersimpan di Google Drive & Google Sheet!",
        proofUrl: proofUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "update_status") {
      var sheet = ss.getSheetByName("Pelanggan");
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(payload.id)) {
          sheet.getRange(i + 1, 9).setValue(payload.status);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "approve_payment") {
      var sheetPay = ss.getSheetByName("Pembayaran");
      var data = sheetPay.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(payload.paymentId)) {
          sheetPay.getRange(i + 1, 8).setValue("paid");
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "unknown_action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
