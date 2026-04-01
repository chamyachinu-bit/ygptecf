function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: "YGPT EVENT Apps Script is live" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const secret = PropertiesService.getScriptProperties().getProperty("APP_SECRET");

    if (!body.secret || body.secret !== secret) {
      return json({ ok: false, error: "unauthorized" });
    }

    if (body.action === "setup_event_drive") {
      return json(setupEventDrive(body));
    }

    if (body.to && body.subject && body.html) {
      MailApp.sendEmail({
        to: body.to,
        subject: body.subject,
        htmlBody: body.html
      });
      return json({ ok: true, message: "email_sent" });
    }

    return json({ ok: false, error: "unknown_payload" });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupEventDrive(body) {
  const event = body.event || {};
  const roots = body.roots || {};
  const automationMode = body.automation_mode || "script_managed";

  const eventLabel = sanitizeName(
    [event.event_code || "EVENT", event.title || "Untitled Event"].join(" - ")
  );

  const configuredDriveRoot = openFolderFromUrl(roots.drive_root_url);
  const proposalRoot = openFolderFromUrl(roots.proposal_root_url);
  const mediaRoot = openFolderFromUrl(roots.media_root_url);
  const reportRoot = openFolderFromUrl(roots.report_root_url);
  const invoiceRoot = openFolderFromUrl(roots.invoice_root_url);

  let driveRoot = configuredDriveRoot;
  if (!driveRoot && automationMode === "script_managed") {
    driveRoot = getOrCreateAutomationRoot(body.fallback_shared_drive_url);
  }

  if (!driveRoot && !proposalRoot && !mediaRoot && !reportRoot && !invoiceRoot) {
    return { ok: false, error: "No valid Drive roots configured and no automation root available" };
  }

  const regionFolder = driveRoot ? getOrCreateChildFolder(driveRoot, sanitizeName(event.region || "General")) : null;
  const eventFolder = regionFolder ? getOrCreateChildFolder(regionFolder, eventLabel) : null;

  const proposalFolder = createTypedFolder(proposalRoot, eventFolder, eventLabel, "Proposal");
  const mediaFolder = createTypedFolder(mediaRoot, eventFolder, eventLabel, "Media");
  const reportFolder = createTypedFolder(reportRoot, eventFolder, eventLabel, "Report");
  const invoiceFolder = createTypedFolder(invoiceRoot, eventFolder, eventLabel, "Invoices");

  return {
    ok: true,
    message: "drive_links_created",
    drive_event_url: eventFolder ? eventFolder.getUrl() : null,
    proposal_drive_url: proposalFolder ? proposalFolder.getUrl() : null,
    media_drive_url: mediaFolder ? mediaFolder.getUrl() : null,
    report_drive_url: reportFolder ? reportFolder.getUrl() : null,
    invoice_drive_url: invoiceFolder ? invoiceFolder.getUrl() : null
  };
}

function getOrCreateAutomationRoot(fallbackUrl) {
  const properties = PropertiesService.getScriptProperties();
  const savedRootId = properties.getProperty("DRIVE_MASTER_FOLDER_ID");
  if (savedRootId) {
    try {
      return DriveApp.getFolderById(savedRootId);
    } catch (err) {
      properties.deleteProperty("DRIVE_MASTER_FOLDER_ID");
    }
  }

  const fallbackFolder = openFolderFromUrl(fallbackUrl);
  if (fallbackFolder) {
    properties.setProperty("DRIVE_MASTER_FOLDER_ID", fallbackFolder.getId());
    return fallbackFolder;
  }

  const namedFolders = DriveApp.getFoldersByName("YGPT EVENT Automation");
  if (namedFolders.hasNext()) {
    const folder = namedFolders.next();
    properties.setProperty("DRIVE_MASTER_FOLDER_ID", folder.getId());
    return folder;
  }

  const folder = DriveApp.createFolder("YGPT EVENT Automation");
  properties.setProperty("DRIVE_MASTER_FOLDER_ID", folder.getId());
  return folder;
}

function createTypedFolder(specificRoot, eventFolder, eventLabel, childName) {
  if (specificRoot) {
    const scopedEventFolder = getOrCreateChildFolder(specificRoot, eventLabel);
    return getOrCreateChildFolder(scopedEventFolder, childName);
  }
  if (eventFolder) {
    return getOrCreateChildFolder(eventFolder, childName);
  }
  return null;
}

function openFolderFromUrl(url) {
  if (!url) return null;
  const id = extractDriveFolderId(url);
  if (!id) return null;
  try {
    return DriveApp.getFolderById(id);
  } catch (err) {
    return null;
  }
}

function extractDriveFolderId(url) {
  if (!url) return null;

  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{20,})$/
  ];

  for (var i = 0; i < patterns.length; i++) {
    const match = String(url).match(patterns[i]);
    if (match && match[1]) return match[1];
  }

  return null;
}

function getOrCreateChildFolder(parentFolder, name) {
  const existing = parentFolder.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parentFolder.createFolder(name);
}

function sanitizeName(name) {
  return String(name || "Untitled")
    .replace(/[\\/:*?"<>|#%\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
