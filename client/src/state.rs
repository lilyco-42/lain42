use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalConfig {
    pub post_id: String,
    pub version_hash: String,
    pub title: String,
    pub files: Vec<(String, String)>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    pub server_url: String,
    pub auth_token: String,
    pub configs: HashMap<String, LocalConfig>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            server_url: "http://localhost:50051".to_string(),
            auth_token: String::new(),
            configs: HashMap::new(),
        }
    }
}

fn state_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("lain")
        .join("state.json")
}

impl AppState {
    pub fn load() -> Self {
        let path = state_path();
        if path.exists() {
            let data = fs::read_to_string(&path).unwrap_or_default();
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            AppState::default()
        }
    }

    pub fn save(&self) {
        let path = state_path();
        fs::create_dir_all(path.parent().unwrap()).ok();
        fs::write(&path, serde_json::to_string_pretty(self).unwrap()).ok();
    }

    pub fn token_header(&self) -> String {
        format!("Bearer {}", self.auth_token)
    }
}
