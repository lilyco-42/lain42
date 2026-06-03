mod grpc;
mod state;
mod ui;

use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use state::AppState;
use std::io;

enum Tab {
    Sync,
    Settings,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut state = AppState::load();
    let mut tab = Tab::Sync;
    let mut sync_tab = ui::sync::SyncTab::new();
    let mut settings_tab = ui::settings::SettingsTab::new();

    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Attempt gRPC connection but don't fail if server isn't running
    let mut client = if state.auth_token.is_empty() {
        sync_tab.status = "请先在设置中填入 API Token".to_string();
        None
    } else {
        match grpc::LainClient::connect(&state.server_url, &state.auth_token).await {
            Ok(c) => Some(c),
            Err(e) => {
                sync_tab.status = format!("连接失败: {}", e);
                None
            }
        }
    };

    loop {
        terminal.draw(|frame| {
            let area = frame.area();
            match tab {
                Tab::Sync => sync_tab.render(frame, area),
                Tab::Settings => settings_tab.render(frame, area, &state),
            }
        })?;

        if event::poll(std::time::Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                match key.code {
                    KeyCode::Char('q') => break,
                    KeyCode::Char('1') => tab = Tab::Sync,
                    KeyCode::Char('2') => tab = Tab::Settings,
                    KeyCode::Char('r') => {
                        if let Some(ref mut c) = client {
                            sync_tab.refresh(c, &state).await;
                        } else if !state.auth_token.is_empty() {
                            // Attempt reconnect
                            match grpc::LainClient::connect(
                                &state.server_url,
                                &state.auth_token,
                            )
                            .await
                            {
                                Ok(c) => {
                                    client = Some(c);
                                    sync_tab.status =
                                        "已重新连接，按 'r' 刷新".to_string();
                                }
                                Err(e) => {
                                    sync_tab.status = format!("重连失败: {}", e);
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;
    state.save();

    Ok(())
}
