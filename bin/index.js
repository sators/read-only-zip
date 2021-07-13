#!/usr/bin/env node
const { glob } = require('glob');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

var argv = require('yargs').options(
    {
      inputPath: {
        demandOption: true,
        alias: 'i',
        description: 'Path to folder containing to be included in zip'
      },
      fileName: {
        demandOption: true,
        alias: 'o',
        description: 'Override the shortname in config files'
      },

    }
  ).argv;

(async function() {
    return new Promise(async (resolve) => {
        console.log("Applying read-only attribute to files...")
        glob(argv.inputPath + "/**/*", (err, files) => {
            const failures = []
            if (err){
                return reject(err)
            }
            files.forEach(file => {
                try {
                    if (!fs.lstatSync(file).isDirectory()){
                        fs.chmodSync(file, 0o444)
                    }
                }
                catch(e){
                    failures.push(file)
                }
            })
            console.log(`Files in ${argv.inputPath} made read-only.`)
            failures.forEach(file => console.log(`Could not make readonly: ${file}`))
        })

        //now lets put this into a ZIP file for delivery to customer
        const zipname = argv.fileName.replace(/\s+/g, '-');
        console.log("Compressing files into", zipname)
        var outputStream = fs.createWriteStream(path.join(process.cwd(), zipname));
        var archive = archiver('zip');

        outputStream.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('Zip file created successfully.');
            resolve()
        });
        archive.on('warning', function(err){
            console.log("Archive Warning Code:", err.code)
            console.log(err)
        });
        archive.on('error', function(err){
            console.log("Archive Error")
            console.error(err)
        });

        archive.pipe(outputStream);

        // append files from a sub-directory, putting its contents at the root of archive
        archive.directory(argv.inputPath, false);
        archive.finalize();
    })
  })()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })