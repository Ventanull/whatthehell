const Contact = require("../models/Contact");
const csv = require("csv-parser");
const fs = require("fs");

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ contacts });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.addContact = async (req, res) => {
  try {
    const { name, phone, tags } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    // Clean phone number
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    const contact = await Contact.create({
      userId: req.user.id,
      name,
      phone: cleanPhone,
      tags: tags || [],
    });

    res.status(201).json({ message: "Contact added", contact });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.uploadCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please upload a CSV file" });

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        const contactsToInsert = [];
        for (const row of results) {
          // Flexible headers: 'phone' or 'number' or 'Phone', 'name' or 'Name'
          const phone = row.phone || row.Phone || row.number || row.Number;
          const name = row.name || row.Name || "";

          if (phone) {
            const cleanPhone = phone.replace(/[^0-9]/g, "");
            contactsToInsert.push({
              userId: req.user.id,
              name,
              phone: cleanPhone,
              tags: ["csv_import"],
            });
          }
        }

        if (contactsToInsert.length > 0) {
          await Contact.insertMany(contactsToInsert);
        }

        // Clean up file
        fs.unlinkSync(req.file.path);

        res.json({ message: `Successfully imported ${contactsToInsert.length} contacts` });
      });
  } catch (error) {
    console.error("CSV Upload Error:", error);
    res.status(500).json({ error: "Server error during CSV processing" });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json({ message: "Contact deleted" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.exportCSV = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id });
    
    // Create CSV string
    const headers = ['Name', 'Phone', 'Tags', 'Created At'];
    const rows = contacts.map(c => {
      const tags = c.tags ? c.tags.join(';') : '';
      return `"${c.name || ''}","${c.phone || ''}","${tags}","${new Date(c.createdAt).toLocaleString()}"`;
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export CSV Error:", error);
    res.status(500).json({ error: "Server error during CSV export" });
  }
};
