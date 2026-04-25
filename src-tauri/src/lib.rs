use base64::{engine::general_purpose, Engine};
use reqwest::Client;
use std::time::Duration;

fn build_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
        .timeout(Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_page(url: String) -> Result<String, String> {
    let client = build_client()?;

    let response = client
        .get(&url)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        .header("Accept-Language", "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7")
        .header("Cache-Control", "no-cache")
        .send()
        .await
        .map_err(|e| format!("Fetch error: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    response.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn mf_request(
    base_url: String,
    auth_scheme: String,
    auth_value: String,
    method: String,
    path: String,
    body: Option<String>,
) -> Result<String, String> {
    let url = format!("{}{}", base_url.trim_end_matches('/'), path);
    let client = build_client()?;
    let req = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err(format!("Unsupported method: {method}")),
    };
    let req = match auth_scheme.as_str() {
        "token" => req.header("X-Auth-Token", &auth_value),
        "basic" => req.header("Authorization", format!("Basic {}", auth_value)),
        _ => return Err(format!("Unsupported auth scheme: {auth_scheme}")),
    };
    let mut req = req
        .header("Content-Type", "application/json")
        .header("Accept", "application/json");
    if let Some(b) = body {
        req = req.body(b);
    }
    let response = req
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;
    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status, text));
    }
    Ok(text)
}

#[tauri::command]
async fn fetch_image_proxied(url: String, referer: String) -> Result<String, String> {
    let client = build_client()?;

    let response = client
        .get(&url)
        .header("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
        .header("Accept-Language", "fr-FR,fr;q=0.9,en;q=0.8")
        .header("Referer", &referer)
        .header("Sec-Ch-Ua", "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"")
        .header("Sec-Ch-Ua-Mobile", "?0")
        .header("Sec-Ch-Ua-Platform", "\"macOS\"")
        .header("Sec-Fetch-Dest", "image")
        .header("Sec-Fetch-Mode", "no-cors")
        .header("Sec-Fetch-Site", "cross-site")
        .send()
        .await
        .map_err(|e| format!("Fetch error: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let mime = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fetch_page,
            fetch_image_proxied,
            mf_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
