
export const EXAMPLE_RUST_CLI = `use std::env;
use std::process;

struct Config {
    query: String,
    filename: String,
    case_sensitive: bool,
}

impl Config {
    fn new(mut args: env::Args) -> Result<Config, &'static str> {
        args.next(); // Skip program name

        let query = match args.next() {
            Some(arg) => arg,
            None => return Err("Didn't get a query string"),
        };

        let filename = match args.next() {
            Some(arg) => arg,
            None => return Err("Didn't get a file name"),
        };

        let case_sensitive = env::var("CASE_INSENSITIVE").is_err();

        Ok(Config {
            query,
            filename,
            case_sensitive,
        })
    }
}

fn run(config: Config) -> Result<(), Box<dyn std::error::Error>> {
    let contents = std::fs::read_to_string(config.filename)?;

    let results = if config.case_sensitive {
        search(&config.query, &contents)
    } else {
        search_case_insensitive(&config.query, &contents)
    };

    for line in results {
        println!("{}", line);
    }

    Ok(())
}

fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    contents
        .lines()
        .filter(|line| line.contains(query))
        .collect()
}

fn search_case_insensitive<'a>(
    query: &str,
    contents: &'a str,
) -> Vec<&'a str> {
    let query = query.to_lowercase();
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.to_lowercase().contains(&query) {
            results.push(line);
        }
    }

    results
}

fn main() {
    let config = Config::new(env::args()).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments: {}", err);
        process::exit(1);
    });

    if let Err(e) = run(config) {
        eprintln!("Application error: {}", e);
        process::exit(1);
    }
}`;

export const EXAMPLE_PYTHON_DATA = `import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression

class DataProcessor:
    def __init__(self, filepath):
        self.filepath = filepath
        self.data = None

    def load_data(self):
        """Loads data from CSV handling errors."""
        try:
            self.data = pd.read_csv(self.filepath)
            print(f"Loaded {len(self.data)} rows.")
        except FileNotFoundError:
            print("Error: File not found.")
            return False
        return True

    def clean_data(self):
        """Removes null values and normalizes features."""
        if self.data is None:
            return
        
        # Bad practice: Dropping all na without checking impact
        self.data.dropna(inplace=True)
        
        # Feature engineering
        self.data['normalized_value'] = np.log(self.data['raw_value'])

    def get_features_targets(self, target_col):
        X = self.data.drop(columns=[target_col])
        y = self.data[target_col]
        return X, y

def train_model(X, y):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Model R2 Score: {score}")
    return model

if __name__ == "__main__":
    processor = DataProcessor("sales_data.csv")
    if processor.load_data():
        processor.clean_data()
        X, y = processor.get_features_targets("sales")
        model = train_model(X, y)
`;

export const EXAMPLE_JS_EXPRESS = `const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET_KEY = "do_not_hardcode_secrets"; 

// Middleware
app.use(bodyParser.json());

// In-memory database (Anti-pattern for production)
const users = [];

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    
    // Missing input validation
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: "User exists" });
    }

    // Security Flaw: Storing passwords in plain text
    users.push({ username, password });
    res.status(201).json({ message: "User registered" });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

app.get('/protected', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        res.json({ message: "Protected data accessed", user });
    });
});

app.listen(PORT, () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
});
`;
