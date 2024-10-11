const bcrypt = require('bcrypt');
const fs = require('fs');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

function generateSalt(costFactor = 12) {
    return bcrypt.genSaltSync(costFactor);
}

function hashPassword(password, salt) {
    return bcrypt.hashSync(password, salt);
}

function verifyPassword(hashedPassword, password) {
    return bcrypt.compareSync(password, hashedPassword);
}

function saveToFile(salt, hashedPassword, filename) {
    const data = {
        salt: salt,
        hashedPassword: hashedPassword
    };
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

function loadFromFile(filename) {
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    return {
        salt: data.salt,
        hashedPassword: data.hashedPassword
    };
}

function getCostFactor() {
    return new Promise((resolve) => {
        readline.question("Enter the cost factor (default 12, typically between 4 and 31): ", (costFactorInput) => {
            if (costFactorInput === '') {
                resolve(12); // Use the default value if the user enters nothing
            } else {
                const costFactor = parseInt(costFactorInput, 10);
                if (isNaN(costFactor) || costFactor < 4 || costFactor > 31) {
                    console.log("The cost factor must be between 4 and 31. Please try again.");
                    resolve(getCostFactor());
                } else {
                    resolve(costFactor);
                }
            }
        });
    });
}

async function main() {
    while (true) {
        console.log("\nOptions:");
        console.log("1. Enter a password and generate a hash.");
        console.log("2. Verify the match between a hash and a password.");
        console.log("3. Save the salt and hash to a file.");
        console.log("4. Load the salt and hash from a file.");
        console.log("5. Enter multiple passwords and generate hashes.");
        console.log("6. Quit.");

        const choice = await new Promise((resolve) => {
            readline.question("Choose an option (1/2/3/4/5/6): ", (answer) => {
                resolve(answer);
            });
        });

        if (choice === '1') {
            const password = await new Promise((resolve) => {
                readline.question("Enter the password: ", (answer) => {
                    resolve(answer);
                });
            });
            const costFactor = await getCostFactor();
            const salt = generateSalt(costFactor);
            const hashedPassword = hashPassword(password, salt);
            console.log(`Salt: ${salt}`);
            console.log(`Password hash: ${hashedPassword}`);

        } else if (choice === '2') {
            try {
                const hashedPassword = await new Promise((resolve) => {
                    readline.question("Enter the password hash: ", (answer) => {
                        resolve(answer);
                    });
                });
                const passwordToVerify = await new Promise((resolve) => {
                    readline.question("Enter the password to verify: ", (answer) => {
                        resolve(answer);
                    });
                });
                const match = verifyPassword(hashedPassword, passwordToVerify);
                console.log(`Does the password match the hash? ${match}`);
            } catch (e) {
                console.log(`Error verifying the password: ${e}`);
            }

        } else if (choice === '3') {
            try {
                const salt = await new Promise((resolve) => {
                    readline.question("Enter the salt: ", (answer) => {
                        resolve(answer);
                    });
                });
                const hashedPassword = await new Promise((resolve) => {
                    readline.question("Enter the password hash: ", (answer) => {
                        resolve(answer);
                    });
                });
                const filename = await new Promise((resolve) => {
                    readline.question("Enter the filename to save the data: ", (answer) => {
                        resolve(answer);
                    });
                });
                saveToFile(salt, hashedPassword, filename);
                console.log(`Data saved to ${filename}`);
            } catch (e) {
                console.log(`Error saving the data: ${e}`);
            }

        } else if (choice === '4') {
            try {
                const filename = await new Promise((resolve) => {
                    readline.question("Enter the filename to load the data: ", (answer) => {
                        resolve(answer);
                    });
                });
                const { salt, hashedPassword } = loadFromFile(filename);
                console.log(`Salt: ${salt}`);
                console.log(`Password hash: ${hashedPassword}`);
            } catch (e) {
                console.log(`Error loading the data: ${e}`);
            }

        } else if (choice === '5') {
            const costFactor = await getCostFactor();
            while (true) {
                const password = await new Promise((resolve) => {
                    readline.question("Enter the password (or type 'quit' to stop): ", (answer) => {
                        resolve(answer);
                    });
                });
                if (password.toLowerCase() === 'quit') {
                    break;
                }
                const salt = generateSalt(costFactor);
                const hashedPassword = hashPassword(password, salt);
                console.log(`Salt: ${salt}`);
                console.log(`Password hash: ${hashedPassword}`);
            }

        } else if (choice === '6') {
            console.log("Goodbye!");
            readline.close();
            break;

        } else {
            console.log("Invalid option. Please choose a valid option.");
        }
    }
}

main();

