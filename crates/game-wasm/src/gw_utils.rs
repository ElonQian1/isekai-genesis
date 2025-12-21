//! WASM 工具函数
//!
//! 模块: game-wasm
//! 前缀: gw_
//! 文档: 文档/02-game-wasm.md

use wasm_bindgen::prelude::*;
use web_sys::console;

/// 日志输出到浏览器 console
#[wasm_bindgen]
pub fn gw_log(message: &str) {
    console::log_1(&JsValue::from_str(message));
}

/// 警告输出到浏览器 console
#[wasm_bindgen]
pub fn gw_warn(message: &str) {
    console::warn_1(&JsValue::from_str(message));
}

/// 错误输出到浏览器 console
#[wasm_bindgen]
pub fn gw_error(message: &str) {
    console::error_1(&JsValue::from_str(message));
}

/// 将 Rust 结构序列化为 JSON 字符串
pub fn gw_to_json<T: serde::Serialize>(value: &T) -> Result<String, JsValue> {
    serde_json::to_string(value)
        .map_err(|e| JsValue::from_str(&format!("JSON 序列化失败: {}", e)))
}

/// 将 JSON 字符串反序列化为 Rust 结构
pub fn gw_from_json<T: serde::de::DeserializeOwned>(json: &str) -> Result<T, JsValue> {
    serde_json::from_str(json)
        .map_err(|e| JsValue::from_str(&format!("JSON 反序列化失败: {}", e)))
}

/// 将 Rust 结构转换为 JS 对象 (使用 serde-wasm-bindgen)
pub fn gw_to_js_value<T: serde::Serialize>(value: &T) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(value)
        .map_err(|e| JsValue::from_str(&format!("转换为 JS 失败: {}", e)))
}

/// 将 JS 对象转换为 Rust 结构 (使用 serde-wasm-bindgen)
pub fn gw_from_js_value<T: serde::de::DeserializeOwned>(value: JsValue) -> Result<T, JsValue> {
    serde_wasm_bindgen::from_value(value)
        .map_err(|e| JsValue::from_str(&format!("从 JS 转换失败: {}", e)))
}
