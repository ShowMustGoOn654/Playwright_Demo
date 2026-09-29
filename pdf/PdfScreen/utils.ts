************


import fs from 'fs';

import path from 'path';

import { PDFParse } from 'pdf-parse';

import pixelmatch from 'pixelmatch';

import { PNG } from 'pngjs';

import { diffLines } from 'diff';

export interface PdfComparisonResult {

    previousFile: string;

    currentFile: string;

    previousPages: number;

    currentPages: number;

    pagesCompared: number;

    pagesWithVisualDifferences: number[];

    textDifferences: boolean;

    passed: boolean;

}

export async function getPdfPageCount(

    pdfPath: string

): Promise<number> {

    if (!fs.existsSync(pdfPath)) {

        throw new Error(`PDF not found: ${pdfPath}`);

    }

    const buffer = fs.readFileSync(pdfPath);

    const parser = new PDFParse({

        data: buffer

    });

    const info = await parser.getInfo({

        parsePageInfo: true

    });

    await parser.destroy();

    return info.total;

}

export async function extractPdfText(

    pdfPath: string

): Promise<string> {

    const buffer = fs.readFileSync(pdfPath);

    const parser = new PDFParse({

        data: buffer

    });

    const result = await parser.getText();

    await parser.destroy();

    return result.text;

}

export async function renderPdfPages(

    pdfPath: string,

    outputDirectory: string

): Promise<string[]> {

    fs.mkdirSync(outputDirectory, {

        recursive: true

    });

    const buffer = fs.readFileSync(pdfPath);

    const parser = new PDFParse({

        data: buffer

    });

    const result = await parser.getScreenshot({

        scale: 1.5

    });

    const imagePaths: string[] = [];

    for (let i = 0; i < result.pages.length; i++) {

        const pageNumber = i + 1;

        const imagePath = path.join(

            outputDirectory,

            `page-${pageNumber}.png`

        );

        fs.writeFileSync(

            imagePath,

            result.pages[i].data

        );

        imagePaths.push(imagePath);

    }

    await parser.destroy();

    return imagePaths;

}

export async function comparePdf(

    currentPdfPath: string,

    previousPdfPath: string,

    outputDirectory: string

): Promise<PdfComparisonResult> {

    fs.mkdirSync(outputDirectory, {

        recursive: true

    });

    console.log('\n======================================');

    console.log('PDF COMPARISON');

    console.log('======================================');

    console.log(`CURRENT : ${currentPdfPath}`);

    console.log(`PREVIOUS: ${previousPdfPath}`);

    // ------------------------------------

    // Page count

    // ------------------------------------

    const currentPages =

        await getPdfPageCount(currentPdfPath);

    const previousPages =

        await getPdfPageCount(previousPdfPath);

    console.log(

        `Current PDF pages : ${currentPages}`

    );

    console.log(

        `Previous PDF pages: ${previousPages}`

    );

    // ------------------------------------

    // Text comparison

    // ------------------------------------

    const currentText =

        await extractPdfText(currentPdfPath);

    const previousText =

        await extractPdfText(previousPdfPath);

    const differences =

        diffLines(

            previousText,

            currentText

        );

    let textDifferences = false;

    console.log('\n========== TEXT DIFFERENCES ==========');

    for (const part of differences) {

        if (part.removed) {

            textDifferences = true;

            console.log(

                '\nPREVIOUS:',

                part.value

            );

        }

        if (part.added) {

            textDifferences = true;

            console.log(

                'CURRENT:',

                part.value

            );

        }

    }

    // ------------------------------------

    // Render PDFs

    // ------------------------------------

    const currentImages =

        await renderPdfPages(

            currentPdfPath,

            path.join(

                outputDirectory,

                'current'

            )

        );

    const previousImages =

        await renderPdfPages(

            previousPdfPath,

            path.join(

                outputDirectory,

                'previous'

            )

        );

    // ------------------------------------

    // Visual comparison

    // ------------------------------------

    const pagesToCompare =

        Math.min(

            currentImages.length,

            previousImages.length

        );

    const pagesWithVisualDifferences:

        number[] = [];

    for (

        let i = 0;

        i < pagesToCompare;

        i++

    ) {

        const pageNumber = i + 1;

        const currentImage =

            PNG.sync.read(

                fs.readFileSync(

                    currentImages[i]

                )

            );

        const previousImage =

            PNG.sync.read(

                fs.readFileSync(

                    previousImages[i]

                )

            );

        if (

            currentImage.width !==

                previousImage.width ||

            currentImage.height !==

                previousImage.height

        ) {

            pagesWithVisualDifferences.push(

                pageNumber

            );

            console.log(

                `Page ${pageNumber}: DIFFERENT SIZE`

            );

            continue;

        }

        const diffImage =

            new PNG({

                width: currentImage.width,

                height: currentImage.height

            });

        const differentPixels =

            pixelmatch(

                previousImage.data,

                currentImage.data,

                diffImage.data,

                currentImage.width,

                currentImage.height,

                {

                    threshold: 0.1

                }

            );

        if (differentPixels > 0) {

            pagesWithVisualDifferences.push(

                pageNumber

            );

            const diffPath =

                path.join(

                    outputDirectory,

                    `page-${pageNumber}-diff.png`

                );

            fs.writeFileSync(

                diffPath,

                PNG.sync.write(diffImage)

            );

            console.log(

                `Page ${pageNumber}: DIFFERENT`

            );

        } else {

            console.log(

                `Page ${pageNumber}: SAME`

            );

        }

    }

    console.log('\n======================================');

    return {

        previousFile: previousPdfPath,

        currentFile: currentPdfPath,

        previousPages,

        currentPages,

        pagesCompared: pagesToCompare,

        pagesWithVisualDifferences,

        textDifferences,

        passed:

            currentPages === previousPages &&

            pagesWithVisualDifferences.length === 0

    };

}