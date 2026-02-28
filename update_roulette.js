const fs = require('fs');

const rawData = fs.readFileSync('questions_final.json', 'utf8');
let questions = JSON.parse(rawData);

// Remove old ROULETTE questions
questions = questions.filter(q => q.game_type !== 'ROULETTE');

// Brand new ROULETTE questions
const newRouletteQuestions = [
    {
        "game_type": "ROULETTE",
        "difficulty": "STANDARD",
        "title": "Global Scope Reassignment",
        "problem_statement": "Predict the exact output printed to the console.",
        "starter_code": "x = 10\ndef change():\n    global x\n    x = 20\n    y = x\nchange()\nprint(x)",
        "constraints": "",
        "test_cases": [
            {
                "expected": "20"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "STANDARD",
        "title": "List Slicing Reversal",
        "problem_statement": "Predict the exact string output.",
        "starter_code": "s = \"python\"\nprint(s[::-1][2:4])",
        "constraints": "",
        "test_cases": [
            {
                "expected": "ht"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "STANDARD",
        "title": "Boolean Short Circuit",
        "problem_statement": "Predict the exact boolean output (True or False).",
        "starter_code": "def A(): return True\ndef B(): return False\nprint(B() and A() or A())",
        "constraints": "",
        "test_cases": [
            {
                "expected": "True"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "STANDARD",
        "title": "String Immutability",
        "problem_statement": "Predict the exact output.",
        "starter_code": "s = \"cat\"\ns.upper()\nprint(s)",
        "constraints": "",
        "test_cases": [
            {
                "expected": "cat"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "STANDARD",
        "title": "List Pop Index Shift",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "lst = \nlst.pop(1)\nprint(lst)",
        "constraints": "",
        "test_cases": [
            {
                "expected": "40"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "STANDARD",
        "title": "Dictionary Default Values",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "d = {'a': 1}\nprint(d.get('b', 5) + d.get('a', 10))",
        "constraints": "",
        "test_cases": [
            {
                "expected": "6"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "STANDARD",
        "title": "Set Intersection",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "s1 = {1, 2, 3}\ns2 = {3, 4, 5}\ns3 = s1 & s2\nprint(list(s3))",
        "constraints": "",
        "test_cases": [
            {
                "expected": "3"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "STANDARD",
        "title": "For-Else Block Execution",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "ans = 0\nfor i in range(3):\n    if i == 5:\n        break\n    ans += 1\nelse:\n    ans += 10\nprint(ans)",
        "constraints": "",
        "test_cases": [
            {
                "expected": "13"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "HIGH",
        "title": "Mutable Default Argument Trap",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "def add_val(val, lst=[]):\n    lst.append(val)\n    return len(lst)\nprint(add_val(1) + add_val(2))",
        "constraints": "",
        "test_cases": [
            {
                "expected": "3"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "HIGH",
        "title": "Late Binding Closures",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "def outer():\n    funcs = []\n    for i in range(3):\n        funcs.append(lambda: i)\n    return funcs\n\nfns = outer()\nprint(fns() + fns())",
        "constraints": "",
        "test_cases": [
            {
                "expected": "4"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "HIGH",
        "title": "Class Variable Shadowing",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "class A: x = 1\nclass B(A): pass\nclass C(A): pass\nB.x = 2\nA.x = 3\nprint(C.x + B.x)",
        "constraints": "",
        "test_cases": [
            {
                "expected": "5"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "HIGH",
        "title": "Try-Finally Return Priority",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "def process():\n    try:\n        return 10\n    finally:\n        return 20\nprint(process())",
        "constraints": "",
        "test_cases": [
            {
                "expected": "20"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "HIGH",
        "title": "Generator Exhaustion",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "gen = (x for x in )\na = list(gen)\nb = list(gen)\nprint(len(a) + len(b))",
        "constraints": "",
        "test_cases": [
            {
                "expected": "3"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "HIGH",
        "title": "List Multiplication Reference",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "grid = [[]] * 3\ngrid[0].append(9)\nprint(sum(len(grid[i]) for i in range(3)))",
        "constraints": "",
        "test_cases": [
            {
                "expected": "3"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "HIGH",
        "title": "Dictionary Hash Collisions",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "d = {True: 1, 1: 2, 1.0: 3}\nprint(len(d) + d[True])",
        "constraints": "",
        "test_cases": [
            {
                "expected": "4"
            }
        ],
        "is_used": false,
        "is_active": true
    },
    {
        "game_type": "ROULETTE",
        "difficulty": "HIGH",
        "title": "Decorator Wrap Execution",
        "problem_statement": "Predict the exact integer output.",
        "starter_code": "def dec(func):\n    def wrapper():\n        return func() * 2\n    return wrapper\n\n@dec\ndef get_val():\n    return 5\n\nprint(get_val())",
        "constraints": "",
        "test_cases": [
            {
                "expected": "10"
            }
        ],
        "is_used": false,
        "is_active": true
    }
];

// Reinsert new ROULETTE questions
questions.push(...newRouletteQuestions);

fs.writeFileSync('questions_final.json', JSON.stringify(questions, null, 2));
console.log(`Replaced Roulette questions. Total questions now: ${questions.length}`);
