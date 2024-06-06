const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const numWords = require('num-words');

// Function to read HTML template
const readTemplate = (filePath) => {
    return fs.readFileSync(filePath, 'utf8');
};

// Function to create the invoice
const createInvoice = async (data) => {
    const templateHtml = readTemplate('invoice_template.html');
    const template = Handlebars.compile(templateHtml);
    
    // Calculate derived fields
    let totalNetAmount = 0;
    data.items.forEach(item => {
        item.net_amount = item.unit_price * item.quantity - item.discount;
        item.tax_amount = item.net_amount * item.tax_rate / 100;
        item.total_amount = item.net_amount + item.tax_amount;
        totalNetAmount += item.net_amount;
    });

    const totalTaxAmount = data.items.reduce((sum, item) => sum + item.tax_amount, 0);
    const totalAmount = totalNetAmount + totalTaxAmount;
    const amountInWords = numWords(totalAmount);

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
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    await page.pdf({ path: 'invoice.pdf', format: 'A4' });

    await browser.close();
};

// Sample data for testing
const data = {
    logo: 'path_to_logo.png',
    invoice_no: 'INV-123',
    invoice_date: '2023-01-01',
    order_no: 'ORD-456',
    order_date: '2023-01-01',
    seller_name: 'ABC Pvt Ltd',
    seller_address: '123, Elm Street, City, State, 123456',
    seller_pan: 'ABCDE1234F',
    seller_gst: '22AAAAA0000A1Z5',
    billing_name: 'John Doe',
    billing_address: '456, Maple Street, City, State, 654321',
    billing_state_code: '12',
    place_of_supply: 'State',
    shipping_name: 'Jane Doe',
    shipping_address: '789, Oak Street, City, State, 987654',
    shipping_state_code: '12',
    place_of_delivery: 'State',
    items: [
        {
            description: 'Product 1',
            unit_price: 100,
            quantity: 2,
            discount: 10,
            tax_rate: 18
        },
        {
            description: 'Product 2',
            unit_price: 200,
            quantity: 1,
            discount: 20,
            tax_rate: 18
        }
    ],
    signature: 'path_to_signature.png'
};

// Create the invoice
createInvoice(data).then(() => console.log('Invoice created successfully'));
