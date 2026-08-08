using System;
using System.IO;
using System.Windows;

namespace RetroTube
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
            Closed += MainWindow_Closed;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            try
            {
                // Set custom user data folder in LocalAppData to avoid directory write permission failures
                var webViewDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                    "RetroTube", 
                    "WebView2"
                );
                
                // Initialize WebView2 Environment with custom data folder
                var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(userDataFolder: webViewDataFolder);
                
                await webView.EnsureCoreWebView2Async(env);
                webView.Source = new Uri("http://localhost:3000/");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"WebView2の初期化中にエラーが発生しました:\n{ex.Message}\n\nWebView2ランタイムがインストールされているか確認してください。", 
                    "初期化エラー", 
                    MessageBoxButton.OK, 
                    MessageBoxImage.Error
                );
            }
        }

        private void MainWindow_Closed(object? sender, EventArgs e)
        {
            // Ensure the entire WPF application shuts down cleanly when the window is closed
            Application.Current.Shutdown();
        }
    }
}
