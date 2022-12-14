pub fn multi_line(vec: &Vec<String>) -> String {
    let mut result = String::new();
    for line in vec {
        result.push_str(line.as_str());
    }
    result
}

