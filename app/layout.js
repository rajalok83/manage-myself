export const metadata = {
  title: 'Secure Cipher Vault Application',
  description: 'Zero plaintext configuration password registry storage structures'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#f7fafc', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
