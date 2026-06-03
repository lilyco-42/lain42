use ratatui::{
    layout::{Constraint, Layout, Rect},
    style::{Color, Style},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame,
};
use crate::grpc::LainClient;
use crate::state::AppState;
use std::collections::HashMap;

pub struct SyncTab {
    pub outdated_ids: Vec<String>,
    pub synced: HashMap<String, String>,
    pub status: String,
}

impl SyncTab {
    pub fn new() -> Self {
        SyncTab {
            outdated_ids: vec![],
            synced: HashMap::new(),
            status: "按 'r' 刷新同步状态".to_string(),
        }
    }

    pub async fn refresh(&mut self, client: &mut LainClient, state: &AppState) {
        self.status = "检查更新中...".to_string();
        let locals: Vec<crate::grpc::proto::ConfigVersion> = state
            .configs
            .values()
            .map(|c| crate::grpc::proto::ConfigVersion {
                post_id: c.post_id.clone(),
                version_hash: c.version_hash.clone(),
            })
            .collect();

        match client.check_updates(locals).await {
            Ok(resp) => {
                self.outdated_ids = resp.outdated_post_ids;
                self.synced.clear();
                for id in &resp.up_to_date_post_ids {
                    if let Some(c) = state.configs.get(id) {
                        self.synced
                            .insert(c.post_id.clone(), c.title.clone());
                    }
                }
                self.status = format!(
                    "{} 个有更新, {} 个已是最新",
                    self.outdated_ids.len(),
                    self.synced.len(),
                );
            }
            Err(e) => {
                self.status = format!("连接失败: {}", e);
            }
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::vertical([Constraint::Length(3), Constraint::Min(0)]).split(area);

        let status = Paragraph::new(self.status.as_str())
            .block(Block::default().borders(Borders::ALL).title("状态"));
        frame.render_widget(status, chunks[0]);

        let mut items: Vec<ListItem> = vec![];

        if !self.outdated_ids.is_empty() {
            items.push(
                ListItem::new("── 可更新 ──").style(Style::default().fg(Color::Yellow)),
            );
            for id in &self.outdated_ids {
                items.push(ListItem::new(format!("  ✦ {}", id)));
            }
        }

        if !self.synced.is_empty() {
            items.push(
                ListItem::new("── 已同步 ──").style(Style::default().fg(Color::Green)),
            );
            for (id, title) in &self.synced {
                items.push(ListItem::new(format!("  ✓ {} - {}", title, id)));
            }
        }

        if self.outdated_ids.is_empty() && self.synced.is_empty() {
            items.push(ListItem::new(
                "  没有已订阅的配置。在网页端收藏配置并开启自动同步。",
            ));
        }

        let list = List::new(items)
            .block(Block::default().borders(Borders::ALL).title("配置列表"));
        frame.render_widget(list, chunks[1]);
    }
}
