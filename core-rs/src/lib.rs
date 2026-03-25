//! Gravytos Core Engine (Rust)
//! Future home of the high-performance core.
//! Currently, the core engine is implemented in TypeScript.

pub fn version() -> &'static str {
    "0.1.0"
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_version() {
        assert_eq!(version(), "0.1.0");
    }
}
