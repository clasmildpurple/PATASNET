/**
 * Google Apps Script Web App Template for Patas Net
 * 
 * PETUNJUK PEMASANGAN DI GOOGLE SPREADSHEET:
 * 1. Buat Google Spreadsheet baru di Google Drive Anda (beri nama misal: "Database Patas Net WiFi").
 * 2. Buat 4 Sheet (Tab):
 *    - "Pelanggan"
 *    - "Pembayaran"
 *    - "Tiket"
 *    - "Pengaturan"
 * 3. Klik menu "Extensions" (Ekstensi) > "Apps Script".
 * 4. Hapus seluruh kode default di Code.gs, lalu paste seluruh kode di bawah ini.
 * 5. Klik "Deploy" (Terapkan) > "New deployment" (Penerapan baru).
 * 6. Pilih tipe: "Web app" (Aplikasi Web).
 * 7. Setting:
 *    - Description: "Patas Net Web App API"
 *    - Execute as: "Me" (Saya)
 *    - Who has access: "Anyone" (Siapa saja, bahkan anonim)
 * 8. Klik Deploy & berikan otorisasi izin Google Drive & Sheets.
 * 9. Salin "Web App URL" (berakhiran /exec) dan tempel ke Dashboard Admin atau Dashboard Developer Patas Net.
 */

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script Web App - Backend Database Patas Net WiFi
 * Otomatis sinkronisasi data pelanggan ke Google Sheet dan foto KTP, Bukti Bayar & Logo ke Google Drive
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

  // Sheet 4: Pengaturan & Logo
  var sheetPengaturan = ss.getSheetByName("Pengaturan") || ss.insertSheet("Pengaturan");
  if (sheetPengaturan.getLastRow() === 0) {
    sheetPengaturan.appendRow(["Key", "Value", "UpdatedAt"]);
    sheetPengaturan.appendRow(["name", "Patas Net WiFi", new Date()]);
    sheetPengaturan.appendRow(["logoText", "PATAS NET", new Date()]);
    sheetPengaturan.appendRow(["logoUrl", "", new Date()]);
    sheetPengaturan.appendRow(["address", "Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110", new Date()]);
    sheetPengaturan.appendRow(["themeColor", "#2563eb", new Date()]);
    sheetPengaturan.appendRow(["tagline", "Internet Cepat Harga Merakyat", new Date()]);
    sheetPengaturan.appendRow(["coverageText", "5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan", new Date()]);
    sheetPengaturan.appendRow(["legalName", "PT. AMANUSA TELEMEDIA", new Date()]);
    sheetPengaturan.appendRow(["whatsappNumber", "0812-3456-7890", new Date()]);
    sheetPengaturan.getRange("A1:C1").setFontWeight("bold").setBackground("#6366f1").setFontColor("#ffffff");
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
    if (!base64String || typeof base64String !== 'string') return "";
    var folder = getOrCreateFolder(folderName);
    var mime = "image/png";
    var base64Data = base64String;
    
    if (base64String.indexOf(",") !== -1) {
      var parts = base64String.split(",");
      if (parts[0].indexOf(":") !== -1 && parts[0].indexOf(";") !== -1) {
        mime = parts[0].split(":")[1].split(";")[0];
      }
      base64Data = parts[1];
    }
    
    var data = Utilities.base64Decode(base64Data);
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
    setupHeaders();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPelanggan = ss.getSheetByName("Pelanggan");
    var sheetPembayaran = ss.getSheetByName("Pembayaran");
    var sheetTiket = ss.getSheetByName("Tiket");
    var sheetPengaturan = ss.getSheetByName("Pengaturan");

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

    // Read Settings & Logo
    var settings = {
      name: "Patas Net WiFi",
      logoText: "PATAS NET",
      logoUrl: "",
      address: "Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110",
      themeColor: "#2563eb"
    };
    if (sheetPengaturan && sheetPengaturan.getLastRow() > 1) {
      var sData = sheetPengaturan.getDataRange().getValues();
      for (var s = 1; s < sData.length; s++) {
        var k = String(sData[s][0]).trim();
        var v = String(sData[s][1] || "");
        if (k) settings[k] = v;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      customers: customers,
      tickets: tickets,
      settings: settings,
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
        ktpUrl = saveBase64ToDrive(payload.ktpImageBase64, "KTP_" + (payload.name || "user") + "_" + (payload.id || Date.now()) + ".jpg", "PatasNet_Drive_KTP");
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

    if (action === "update_settings" || action === "update_logo") {
      var sheetPeng = ss.getSheetByName("Pengaturan");
      var finalLogoUrl = payload.logoUrl || "";
      
      // Jika dikirimkan gambar logo baru dalam format base64, simpan langsung ke Google Drive
      if (payload.logoBase64) {
        finalLogoUrl = saveBase64ToDrive(payload.logoBase64, "LOGO_PATASNET_" + Date.now() + ".png", "PatasNet_Drive_Logos");
      }

      var sData = sheetPeng.getDataRange().getValues();
      var keysToUpdate = {
        name: payload.name,
        logoText: payload.logoText,
        logoUrl: finalLogoUrl || payload.logoUrl,
        address: payload.address,
        themeColor: payload.themeColor,
        tagline: payload.tagline,
        coverageText: payload.coverageText,
        legalName: payload.legalName,
        whatsappNumber: payload.whatsappNumber
      };

      for (var key in keysToUpdate) {
        if (keysToUpdate[key] !== undefined && keysToUpdate[key] !== null) {
          var found = false;
          for (var r = 1; r < sData.length; r++) {
            if (String(sData[r][0]).trim() === key) {
              sheetPeng.getRange(r + 1, 2).setValue(keysToUpdate[key]);
              sheetPeng.getRange(r + 1, 3).setValue(new Date());
              found = true;
              break;
            }
          }
          if (!found) {
            sheetPeng.appendRow([key, keysToUpdate[key], new Date()]);
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Pengaturan identitas & Logo berhasil diperbarui di Google Sheet & Google Drive!",
        logoUrl: finalLogoUrl || payload.logoUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "sync_all") {
      // Batch sync customers and settings
      if (Array.isArray(payload.customers)) {
        var sheetPel = ss.getSheetByName("Pelanggan");
        var existingCustData = sheetPel.getDataRange().getValues();
        var existingIds = {};
        for (var ex = 1; ex < existingCustData.length; ex++) {
          if (existingCustData[ex][1]) existingIds[String(existingCustData[ex][1])] = true;
        }

        payload.customers.forEach(function(c) {
          if (!existingIds[String(c.id)]) {
            sheetPel.appendRow([
              new Date(c.createdAt || Date.now()),
              c.id,
              c.name,
              c.email,
              c.phone,
              c.address,
              c.coordinates ? c.coordinates.join(", ") : "",
              c.packageId,
              c.status || "active",
              c.ktpImageUrl || ""
            ]);
          }
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Sinkronisasi batch ke Google Sheet berhasil diselesaikan!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "unknown_action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

// Helper methods for client & server
export const STORAGE_SHEETS_CONFIG_KEY = 'patasnet_google_sheets_config_v2';

export interface GoogleSheetsConfig {
  webAppUrl: string;
  driveFolderName?: string;
  autoSync?: boolean;
  syncIntervalSeconds?: number;
  lastSyncedAt?: string;
}

export function getStoredSheetsConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_SHEETS_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
    const legacyUrl = localStorage.getItem('patasnet_google_sheets_url');
    if (legacyUrl) {
      return { webAppUrl: legacyUrl, driveFolderName: 'PatasNet_Drive', autoSync: true, syncIntervalSeconds: 4 };
    }
  } catch {
    // ignore
  }
  return { webAppUrl: '', driveFolderName: 'PatasNet_Drive', autoSync: true, syncIntervalSeconds: 4 };
}

export function saveStoredSheetsConfig(config: GoogleSheetsConfig): void {
  try {
    localStorage.setItem(STORAGE_SHEETS_CONFIG_KEY, JSON.stringify(config));
    if (config.webAppUrl) {
      localStorage.setItem('patasnet_google_sheets_url', config.webAppUrl);
    }
  } catch {
    // ignore
  }
}

export async function pingGoogleSheets(url: string): Promise<{ success: boolean; message: string; data?: any }> {
  if (!url) return { success: false, message: 'URL Google Sheets belum diisi' };
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        return {
          success: true,
          message: `Koneksi Google Sheets & Drive Berhasil! Ditemukan ${data.customers?.length || 0} pelanggan, ${data.tickets?.length || 0} tiket.`,
          data
        };
      }
    }
    return { success: false, message: 'Respon dari Google Sheets tidak valid atau izin Web App belum diatur ke "Anyone".' };
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungi Google Sheets: ${err.message || 'CORS / URL tidak valid'}` };
  }
}
