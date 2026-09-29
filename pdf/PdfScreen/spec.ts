gggggg

import {

    test,

    expect,

    Page

} from '@playwright/test';

import fs from 'fs';

import path from 'path';

import {

    comparePdf

} from '../../../../src/utils/PdfCompareUtil';

test.describe(

    'Plan Sponsor Invoice PDF Comparison',

    () => {

        test(

            'Compare current month PDF with previous month PDF',

            async ({ page }) => {

                // =========================================

                // 1. Open application

                // =========================================

                await page.goto(

                    'YOUR_APPLICATION_URL'

                );

                // =========================================

                // 2. Payments and Invoices

                // =========================================

                await page

                    .getByText(

                        'Payments and Invoices'

                    )

                    .click();

                // =========================================

                // 3. Plan Sponsor Invoices

                // =========================================

                await page

                    .getByText(

                        'Plan Sponsor Invoices'

                    )

                    .click();

                // =========================================

                // 4. Select Bill_WP

                // =========================================

                // Replace this with your existing

                // Plan Sponsor locator.

                await page

                    .getByText('Bill_WP')

                    .click();

                // =========================================

                // 5. Search

                // =========================================

                await page

                    .getByRole(

                        'button',

                        {

                            name: 'Search'

                        }

                    )

                    .click();

                await page.waitForLoadState(

                    'networkidle'

                );

                // =========================================

                // 6. Get invoice rows

                // =========================================

                const invoiceRows =

                    page.locator(

                        'YOUR_INVOICE_ROW_LOCATOR'

                    );

                await expect(

                    invoiceRows.first()

                ).toBeVisible();

                // =========================================

                // 7. Current invoice

                // =========================================

                const currentRow =

                    invoiceRows.nth(0);

                // =========================================

                // 8. Previous invoice

                // =========================================

                const previousRow =

                    invoiceRows.nth(1);

                // =========================================

                // 9. Get invoice numbers

                // =========================================

                const currentInvoice =

                    await currentRow

                        .locator(

                            'YOUR_INVOICE_NUMBER_LOCATOR'

                        )

                        .innerText();

                const previousInvoice =

                    await previousRow

                        .locator(

                            'YOUR_INVOICE_NUMBER_LOCATOR'

                        )

                        .innerText();

                console.log(

                    `Current invoice : ${currentInvoice}`

                );

                console.log(

                    `Previous invoice: ${previousInvoice}`

                );

                // =========================================

                // 10. Download current PDF

                // =========================================

                const currentPdf =

                    await downloadInvoicePdf(

                        page,

                        currentRow,

                        currentInvoice,

                        'current'

                    );

                // =========================================

                // 11. Download previous PDF

                // =========================================

                const previousPdf =

                    await downloadInvoicePdf(

                        page,

                        previousRow,

                        previousInvoice,

                        'previous'

                    );

                // =========================================

                // 12. Compare PDFs

                // =========================================

                const result =

                    await comparePdf(

                        currentPdf,

                        previousPdf,

                        path.join(

                            'test-results',

                            'pdf-comparison',

                            `${currentInvoice}-vs-${previousInvoice}`

                        )

                    );

                // =========================================

                // 13. Assertions

                // =========================================

                expect(

                    result.currentPages

                ).toBe(

                    result.previousPages

                );

                console.log(

                    '\nPDF comparison result:',

                    result

                );

            }

        );

    }

async function downloadInvoicePdf(

    page: Page,

    invoiceRow: any,

    invoiceNumber: string,

    type: 'current' | 'previous'

): Promise<string> {

    const outputDirectory =

        path.join(

            'test-results',

            'pdf-comparison'

        );

    fs.mkdirSync(

        outputDirectory,

        {

            recursive: true

        }

    );

    // ------------------------------------

    // Find PDF action

    // ------------------------------------

    const pdfAction =

        invoiceRow.locator(

            'YOUR_PDF_ACTION_LOCATOR'

        );

    // ------------------------------------

    // Wait for PDF response

    // ------------------------------------

    const responsePromise =

        page.waitForResponse(

            response => {

                const contentType =

                    response

                        .headers()

                        ['content-type'] || '';

                return contentType

                    .toLowerCase()

                    .includes(

                        'application/pdf'

                    );

            }

        );

    await pdfAction.click();

    const response =

        await responsePromise;

    expect(

        response.ok()

    ).toBeTruthy();

    // ------------------------------------

    // Save PDF

    // ------------------------------------

    const pdfPath =

        path.join(

            outputDirectory,

            `${type}-${invoiceNumber}.pdf`

        );

    const pdfBuffer =

        await response.body();

    fs.writeFileSync(

        pdfPath,

        pdfBuffer

    );

    expect(

        fs.existsSync(pdfPath)

    ).toBeTruthy();

    console.log(

        `PDF saved: ${pdfPath}`

    );

    return pdfPath;

}



);

