/**
 * Production-ready Google Apps Script (Code.gs)
 * Ready to be deployed as a Web App connected to Google Sheets & Google Drive
 */

export const GOOGLE_APPS_SCRIPT_SOURCE = `/**
 * ==============================================================================
 * OFFICIAL ELECTION COMMISSION VOTER REGISTRATION & MANAGEMENT API (Code.gs)
 * Chief Election Commission - Urdu Bazar, Lahore
 * Backend: Google Apps Script + Google Sheets + Google Drive
 * ==============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.new) and name it "Urdu_Bazar_Voter_Registry".
 * 2. Click "Extensions" > "Apps Script".
 * 3. Delete existing code in Code.gs and paste this entire file.
 * 4. Click "Deploy" > "New deployment".
 * 5. Select type: "Web app".
 * 6. Set Description: "Official Voter Registration API".
 * 7. Set "Execute as": "Me (your-email@gmail.com)".
 * 8. Set "Who has access": "Anyone" (CRITICAL for public voter registration!).
 * 9. Click "Deploy" and authorize permissions.
 * 10. Copy the Web App URL (ends with /exec) and paste it into the Admin Settings!
 */

// Configuration Constants
var SHEET_NAME_VOTERS = "Voters";
var SHEET_NAME_SETTINGS = "Settings";
var SHEET_NAME_USERS = "Users";
var DRIVE_FOLDER_NAME = "Voter_Photos_Election_Commission";
var DEFAULT_ADMIN_PASSWORD = "admin";

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "getAll";
  
  try {
    if (action === "getAll") {
      return jsonResponse(getAllData());
    } else if (action === "getUsers") {
      return jsonResponse(getUsersList());
    } else if (action === "checkDuplicate") {
      var cnic = e.parameter.cnic || "";
      var mobile = e.parameter.mobile || "";
      return jsonResponse(checkDuplicate(cnic, mobile));
    } else if (action === "getDuplicatesList") {
      return jsonResponse(getDuplicatesList());
    } else if (action === "verifyPassword") {
      var password = e.parameter.password || "";
      return jsonResponse(verifyPassword(password));
    } else if (action === "ping") {
      return jsonResponse({ success: true, message: "Election Commission API Online", timestamp: new Date().toISOString() });
    } else {
      return jsonResponse({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : null;
    var data = {};
    if (rawData) {
      try {
        data = JSON.parse(rawData);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter || {};
    }

    var action = data.action || (e && e.parameter && e.parameter.action);

    if (action === "register") {
      return jsonResponse(registerVoter(data));
    } else if (action === "edit") {
      return jsonResponse(editVoter(data));
    } else if (action === "delete") {
      return jsonResponse(deleteVoter(data));
    } else if (action === "updateSettings") {
      return jsonResponse(updateSettings(data));
    } else if (action === "saveUsers") {
      return jsonResponse(saveUsersList(data.users || []));
    } else if (action === "verifyPassword") {
      return jsonResponse(verifyPassword(data.password));
    } else {
      return jsonResponse({ success: false, error: "Unknown POST action: " + action });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Create or get the designated Drive folder for storing voter photo uploads
 */
function getOrCreateDriveFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Save Base64 Image to Google Drive and return public direct viewing URL
 */
function saveBase64ToDrive(base64Data, voterName, cnic) {
  if (!base64Data) return "";
  
  try {
    // If it's already an HTTP / Drive URL, no upload needed
    if (base64Data.indexOf("http://") === 0 || base64Data.indexOf("https://") === 0) {
      return base64Data;
    }

    var folder = getOrCreateDriveFolder();
    var cleanBase64 = base64Data;
    var contentType = "image/jpeg";
    
    if (base64Data.indexOf("data:") === 0) {
      var parts = base64Data.split(",");
      var meta = parts[0];
      cleanBase64 = parts[1];
      if (meta.indexOf("image/png") !== -1) contentType = "image/png";
      else if (meta.indexOf("image/webp") !== -1) contentType = "image/webp";
    }

    var decodedBytes = Utilities.base64Decode(cleanBase64);
    var safeCnic = (cnic || "VOTER").replace(/[^a-zA-Z0-9]/g, "_");
    var fileName = "Voter_" + safeCnic + "_" + new Date().getTime() + ".jpg";
    var blob = Utilities.newBlob(decodedBytes, contentType, fileName);
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Return direct webContentLink or drive thumbnail link
    var fileId = file.getId();
    return "https://lh3.googleusercontent.com/d/" + fileId + "=w800";
  } catch (err) {
    Logger.log("Error uploading photo: " + err.toString());
    return base64Data; // fallback to storing base64 or placeholder
  }
}

/**
 * Initialize or get Spreadsheet and sheets
 */
function getSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("No active spreadsheet found. Bind this script to a Google Sheet.");
  }
  
  // Ensure Voters sheet exists
  var voterSheet = ss.getSheetByName(SHEET_NAME_VOTERS);
  if (!voterSheet) {
    voterSheet = ss.insertSheet(SHEET_NAME_VOTERS);
    voterSheet.appendRow([
      "Serial #",
      "Registration Date",
      "Full Name",
      "Firm / Shop Name",
      "CNIC",
      "Mobile",
      "Address",
      "Photo URL",
      "Status",
      "Notes"
    ]);
    voterSheet.setFrozenRows(1);
    voterSheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#f8fafc");
  }

  // Ensure Settings sheet exists
  var settingsSheet = ss.getSheetByName(SHEET_NAME_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_NAME_SETTINGS);
    settingsSheet.appendRow(["Key", "Value"]);
    settingsSheet.appendRow(["orgNameUr", "چیف الیکشن کمیشن اردو بازار لاہور"]);
    settingsSheet.appendRow(["orgNameEn", "Chief Election Commission Urdu Bazar Lahore"]);
    settingsSheet.appendRow(["subTitleUr", "انجمن تاجران و ناشران کتب اردو بازار لاہور"]);
    settingsSheet.appendRow(["subTitleEn", "Official Registered Voters Registry"]);
    settingsSheet.appendRow(["phone", "042-37234567 / 0300-8451234"]);
    settingsSheet.appendRow(["logoUrl", "https://api.iconify.design/solar:crown-line-duotone.svg?color=%2310b981"]);
    settingsSheet.appendRow(["adminPassword", DEFAULT_ADMIN_PASSWORD]);
    settingsSheet.appendRow(["commissionerNameUr", "ملک محمد فاروق"]);
    settingsSheet.appendRow(["commissionerTitleUr", "چیف الیکشن کمشنر"]);
    settingsSheet.setFrozenRows(1);
  }

  // Ensure Users sheet exists (for User Management & Roles)
  var usersSheet = ss.getSheetByName(SHEET_NAME_USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_NAME_USERS);
    usersSheet.appendRow([
      "User ID",
      "Username",
      "Full Name",
      "Role",
      "Password",
      "Phone",
      "Status",
      "Created At"
    ]);
    usersSheet.setFrozenRows(1);
    usersSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
    // Seed default admin user
    usersSheet.appendRow([
      "USR-1",
      "admin",
      "چیف ایڈمنسٹریٹر (Chief Admin)",
      "super_admin",
      DEFAULT_ADMIN_PASSWORD,
      "0300-8451234",
      "active",
      new Date().toISOString()
    ]);
  }

  return { ss: ss, voterSheet: voterSheet, settingsSheet: settingsSheet, usersSheet: usersSheet };
}

/**
 * Fetch All Data & Settings
 */
function getAllData() {
  var sheets = getSpreadsheet();
  var vSheet = sheets.voterSheet;
  var sSheet = sheets.settingsSheet;

  var lastRow = vSheet.getLastRow();
  var voters = [];

  if (lastRow > 1) {
    var rows = vSheet.getRange(2, 1, lastRow - 1, 10).getValues();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r[0] || r[2]) {
        voters.push({
          id: String(r[0] || i + 1),
          serialNumber: String(r[0] || "UB-" + (1000 + i + 1)),
          registrationDate: r[1] ? String(r[1]) : new Date().toISOString(),
          fullName: String(r[2] || ""),
          firmName: String(r[3] || ""),
          cnic: String(r[4] || ""),
          mobile: String(r[5] || ""),
          address: String(r[6] || ""),
          photoUrl: String(r[7] || ""),
          status: String(r[8] || "Verified"),
          notes: String(r[9] || "")
        });
      }
    }
  }

  // Load Settings
  var settings = {};
  var sLastRow = sSheet.getLastRow();
  if (sLastRow > 1) {
    var sRows = sSheet.getRange(2, 1, sLastRow - 1, 2).getValues();
    for (var j = 0; j < sRows.length; j++) {
      var k = String(sRows[j][0]);
      var v = String(sRows[j][1]);
      if (k) settings[k] = v;
    }
  }

  return {
    success: true,
    total: voters.length,
    voters: voters,
    settings: settings
  };
}

/**
 * Check if CNIC or Mobile is already registered (Live Validation)
 */
function checkDuplicate(cnic, mobile) {
  var sheets = getSpreadsheet();
  var vSheet = sheets.voterSheet;
  var lastRow = vSheet.getLastRow();

  var cleanCnic = (cnic || "").replace(/[^0-9]/g, "");
  var cleanMobile = (mobile || "").replace(/[^0-9]/g, "");

  var result = {
    success: true,
    cnicExists: false,
    mobileExists: false,
    existingVoterName: ""
  };

  if (lastRow > 1) {
    var rows = vSheet.getRange(2, 1, lastRow - 1, 10).getValues();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var rowCnic = String(r[4] || "").replace(/[^0-9]/g, "");
      var rowMobile = String(r[5] || "").replace(/[^0-9]/g, "");

      if (cleanCnic && cleanCnic.length >= 13 && rowCnic === cleanCnic) {
        result.cnicExists = true;
        result.existingVoterName = String(r[2] || "");
      }
      if (cleanMobile && cleanMobile.length >= 10 && rowMobile === cleanMobile) {
        result.mobileExists = true;
        if (!result.existingVoterName) {
          result.existingVoterName = String(r[2] || "");
        }
      }
    }
  }

  return result;
}

/**
 * Get simple list of all CNICs and Mobiles for instant client-side caching
 */
function getDuplicatesList() {
  var sheets = getSpreadsheet();
  var vSheet = sheets.voterSheet;
  var lastRow = vSheet.getLastRow();

  var cnics = [];
  var mobiles = [];

  if (lastRow > 1) {
    var rows = vSheet.getRange(2, 5, lastRow - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][0]) cnics.push(String(rows[i][0]));
      if (rows[i][1]) mobiles.push(String(rows[i][1]));
    }
  }

  return { success: true, cnics: cnics, mobiles: mobiles };
}

/**
 * Register New Voter (POST action: 'register')
 */
function registerVoter(data) {
  var sheets = getSpreadsheet();
  var vSheet = sheets.voterSheet;
  var lastRow = vSheet.getLastRow();

  // Validate duplicate before inserting
  var dupCheck = checkDuplicate(data.cnic, data.mobile);
  if (dupCheck.cnicExists) {
    return { success: false, error: "CNIC already registered to " + dupCheck.existingVoterName };
  }

  var serialNum = "UB-" + (1000 + (lastRow > 1 ? lastRow : 1));
  var dateStr = new Date().toISOString();

  // Save image to Google Drive
  var photoUrl = "";
  if (data.photoUrl) {
    photoUrl = saveBase64ToDrive(data.photoUrl, data.fullName, data.cnic);
  }

  vSheet.appendRow([
    serialNum,
    dateStr,
    data.fullName || "",
    data.firmName || "",
    data.cnic || "",
    data.mobile || "",
    data.address || "",
    photoUrl,
    data.status || "Verified",
    data.notes || ""
  ]);

  return {
    success: true,
    serialNumber: serialNum,
    photoUrl: photoUrl,
    message: "Voter registered successfully"
  };
}

/**
 * Edit Voter Record (POST action: 'edit')
 */
function editVoter(data) {
  var sheets = getSpreadsheet();
  var vSheet = sheets.voterSheet;
  var lastRow = vSheet.getLastRow();

  if (lastRow <= 1) {
    return { success: false, error: "No records to edit" };
  }

  var targetSerial = String(data.serialNumber || data.id || "");
  var rows = vSheet.getRange(2, 1, lastRow - 1, 10).getValues();

  for (var i = 0; i < rows.length; i++) {
    var rowSerial = String(rows[i][0]);
    if (rowSerial === targetSerial) {
      var rowIndex = i + 2;
      
      var photoUrl = rows[i][7];
      if (data.photoUrl && data.photoUrl.indexOf("data:") === 0) {
        photoUrl = saveBase64ToDrive(data.photoUrl, data.fullName, data.cnic);
      } else if (data.photoUrl) {
        photoUrl = data.photoUrl;
      }

      vSheet.getRange(rowIndex, 3, 1, 8).setValues([[
        data.fullName || rows[i][2],
        data.firmName || rows[i][3],
        data.cnic || rows[i][4],
        data.mobile || rows[i][5],
        data.address || rows[i][6],
        photoUrl,
        data.status || rows[i][8],
        data.notes || rows[i][9]
      ]]);

      return { success: true, message: "Record updated successfully" };
    }
  }

  return { success: false, error: "Record not found with Serial: " + targetSerial };
}

/**
 * Delete Voter Record (POST action: 'delete')
 */
function deleteVoter(data) {
  var sheets = getSpreadsheet();
  var vSheet = sheets.voterSheet;
  var lastRow = vSheet.getLastRow();

  if (lastRow <= 1) {
    return { success: false, error: "No records to delete" };
  }

  var targetSerial = String(data.serialNumber || data.id || "");
  var rows = vSheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === targetSerial) {
      var rowIndex = i + 2;
      vSheet.deleteRow(rowIndex);
      return { success: true, message: "Record deleted successfully" };
    }
  }

  return { success: false, error: "Record not found" };
}

/**
 * Verify Admin Password
 */
function verifyPassword(inputPassword) {
  var sheets = getSpreadsheet();
  var sSheet = sheets.settingsSheet;
  var lastRow = sSheet.getLastRow();

  var storedPassword = DEFAULT_ADMIN_PASSWORD;

  if (lastRow > 1) {
    var rows = sSheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === "adminPassword") {
        storedPassword = String(rows[i][1]);
        break;
      }
    }
  }

  var isValid = (inputPassword === storedPassword);
  return { success: isValid, valid: isValid };
}

/**
 * Update Admin Settings (POST action: 'updateSettings')
 */
function updateSettings(data) {
  var sheets = getSpreadsheet();
  var sSheet = sheets.settingsSheet;

  var keys = ["orgNameUr", "orgNameEn", "subTitleUr", "subTitleEn", "phone", "logoUrl", "adminPassword", "commissionerNameUr", "commissionerTitleUr"];
  
  // Clear and rewrite settings
  sSheet.clear();
  sSheet.appendRow(["Key", "Value"]);
  sSheet.setFrozenRows(1);

  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (data[k] !== undefined) {
      sSheet.appendRow([k, String(data[k])]);
    }
  }

  return { success: true, message: "Settings updated successfully" };
}

/**
 * Get Users List from Users Sheet
 */
function getUsersList() {
  var sheets = getSpreadsheet();
  var uSheet = sheets.usersSheet;
  var lastRow = uSheet.getLastRow();
  var users = [];

  if (lastRow > 1) {
    var rows = uSheet.getRange(2, 1, lastRow - 1, 8).getValues();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r[1]) { // username exists
        users.push({
          id: String(r[0] || "USR-" + (i + 1)),
          username: String(r[1]).toLowerCase().trim(),
          fullName: String(r[2] || ""),
          role: String(r[3] || "data_entry"),
          password: String(r[4] || ""),
          phone: String(r[5] || ""),
          status: String(r[6] || "active"),
          createdAt: r[7] ? String(r[7]) : new Date().toISOString()
        });
      }
    }
  }

  return { success: true, users: users };
}

/**
 * Save / Overwrite Users List in Users Sheet
 */
function saveUsersList(users) {
  var sheets = getSpreadsheet();
  var uSheet = sheets.usersSheet;

  // Clear existing data except header
  uSheet.clear();
  uSheet.appendRow([
    "User ID",
    "Username",
    "Full Name",
    "Role",
    "Password",
    "Phone",
    "Status",
    "Created At"
  ]);
  uSheet.setFrozenRows(1);
  uSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");

  if (Array.isArray(users)) {
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      uSheet.appendRow([
        String(u.id || "USR-" + (i + 1)),
        String(u.username || "").toLowerCase().trim(),
        String(u.fullName || ""),
        String(u.role || "data_entry"),
        String(u.password || ""),
        String(u.phone || ""),
        String(u.status || "active"),
        String(u.createdAt || new Date().toISOString())
      ]);
    }
  }

  return { success: true, message: "Users list synced to Google Sheet successfully", count: users.length };
}

/**
 * Standard JSON Response with CORS Headers
 */
function jsonResponse(obj) {
  var json = JSON.stringify(obj);
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
`;
