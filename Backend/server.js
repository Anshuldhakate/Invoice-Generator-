const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const convertToWords = require('./numWords'); // Import the custom function
const cors = require('cors'); // Import CORS middleware

const app = express();
const PORT = 3000;

// Use CORS
app.use(cors());

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (like logo and signature images)
app.use('/static', express.static(path.join(__dirname, 'static')));

// Function to read HTML template
const readTemplate = (fileName) => {
    const filePath = path.join(__dirname, fileName); // Adjust the file name as needed
    return fs.readFileSync(filePath, 'utf8');
};

// Function to create the invoice
const createInvoice = async (data) => {
    const templateHtml = readTemplate('invoice_template.html');
    const template = Handlebars.compile(templateHtml);

    // Initialize derived fields
    let totalNetAmount = 0;

    if (Array.isArray(data.items)) {
        data.items.forEach(item => {
            item.unit_price = parseFloat(item.unit_price) || 0;
            item.quantity = parseInt(item.quantity) || 0;
            item.discount = parseFloat(item.discount) || 0;
            item.tax_rate = parseFloat(item.tax_rate) || 0;
            item.net_amount = item.unit_price * item.quantity - item.discount;
            item.tax_amount = item.net_amount * item.tax_rate / 100;
            item.total_amount = item.net_amount + item.tax_amount;
            totalNetAmount += item.net_amount;
        });
    } else {
        data.items = [];
    }

    const totalTaxAmount = data.items.reduce((sum, item) => sum + item.tax_amount, 0);
    const totalAmount = totalNetAmount + totalTaxAmount;
    const amountInWords = convertToWords(totalAmount);

    // Check tax type
    if (data.place_of_supply === data.place_of_delivery) {
        data.items.forEach(item => {
            item.tax_type = 'CGST & SGST';
            item.cgst = item.tax_amount / 2;
            item.sgst = item.tax_amount / 2;
        });
    } else {
        data.items.forEach(item => {
            item.tax_type = 'IGST';
            item.igst = item.tax_amount;
        });
    }

    const html = template({
        ...data,
        total_net_amount: totalNetAmount,
        total_tax_amount: totalTaxAmount,
        total_amount: totalAmount,
        amount_in_words: amountInWords
    });

    // Generate PDF
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 120000 // Increase timeout to 120 seconds
    });
    const page = await browser.newPage();

    // Catch console messages for debugging
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    // Set the HTML content of the page
    await page.setContent(html, { waitUntil: 'networkidle2' });

    // Additional debugging
    console.log('Content set, generating PDF...');

    const pdfBuffer = await page.pdf({ format: 'A4', timeout: 120000 });

    await browser.close();

    return pdfBuffer;
};

// Endpoint to handle invoice generation
app.post('/generate-invoice', async (req, res) => {
    console.log('Request received:', req.body);
    try {
        const pdfBuffer = await createInvoice(req.body);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Failed to generate invoice:', error);
        res.status(500).send(`Failed to generate invoice. Error: ${error.message}`);
    }

    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog\n/Outlines 2 0 R\n/Pages 3 0 R >>\nendobj\n2 0 obj\n<< /Type /Outlines\n/Count 0 >>\nendobj\n3 0 obj\n<< /Type /Pages\n/Count 1\n/Kids [4 0 R] >>\nendobj\n4 0 obj\n<< /Type /Page\n/Parent 3 0 R\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n/Resources << /ProcSet 6 0 R /Font << /F1 7 0 R >> >> >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 700 Td (Hello, PDF!) Tj ET\nendstream\nendobj\n6 0 obj\n[/PDF /Text] endobj\n7 0 obj\n<< /Type /Font\n/Subtype /Type1\n/Name /F1\n/BaseFont /Helvetica >>\nendobj\nxref\n0 8\n0000000000 65535 f \n0000000018 00000 n \n0000000077 00000 n \n0000000122 00000 n \n0000000199 00000 n \n0000000308 00000 n \n0000000385 00000 n \n0000000434 00000 n \ntrailer\n<< /Size 8\n/Root 1 0 R >>\nstartxref\n481\n%%EOF', 'utf-8'); // Replace with actual PDF generation logic

    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
