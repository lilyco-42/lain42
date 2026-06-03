use ratatui::{
    layout::{Constraint, Layout, Rect},
    style::{Color, Style},
    widgets::{Block, Borders, Paragraph},
    Frame,
};
use crate::state::AppState;

pub struct SettingsTab {
    pub message: String,
}

impl SettingsTab {
    pub fn new() -> Self {
        SettingsTab {
            message: String::new(),
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect, state: &AppState) {
        let chunks = Layout::vertical([
            Constraint::Length(3),
            Constraint::Length(3),
            Constraint::Length(3),
            Constraint::Min(3),
        ])
        .margin(1)
        .split(area);

        let server = Paragraph::new(format!("服务器: {}", state.server_url))
            .block(Block::default().borders(Borders::ALL).title("服务器地址"));
        frame.render_widget(server, chunks[0]);

        let token_display = if state.auth_token.is_empty() {
            "未设置 (在网页端 Settings 页面获取 token)"
        } else {
            "已设置 ✓"
        };
        let token = Paragraph::new(token_display)
            .block(Block::default().borders(Borders::ALL).title("认证 Token"));
        frame.render_widget(token, chunks[1]);

        let help = Paragraph::new(
            "按键: 1 → 同步 | 2 → 设置 | r → 刷新 | q → 退出\n\
             获取 token: 网页端登录后 → 设置 → API Token",
        )
        .block(Block::default().borders(Borders::ALL).title("帮助"));
        frame.render_widget(help, chunks[2]);

        if !self.message.is_empty() {
            let msg = Paragraph::new(self.message.as_str())
                .style(Style::default().fg(Color::Yellow));
            frame.render_widget(msg, chunks[3]);
        }
    }
}
