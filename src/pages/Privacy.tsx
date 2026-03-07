import React from "react";

export default function PrivacyPage() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "40px auto" }}>
      <h1>TranscrybeAI Privacy Policy</h1>
      <p>Last updated: March 7, 2026</p>

      <p>
        This Privacy Policy explains how TranscrybeAI ("we", "us", or "the
        Service") collects, uses, and shares information when you use our web
        application, and how you can contact us about privacy questions.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li>
          <strong>Account & profile data:</strong> When you sign in with Google
          we collect the basic profile information provided by Google (name,
          email address, profile picture).
        </li>
        <li>
          <strong>Google Drive data:</strong> If you grant access to your
          Google Drive, we may read files or metadata strictly for the
          purposes you authorize (for example, to transcribe audio files).
        </li>
        <li>
          <strong>Usage data:</strong> We collect usage information such as
          logs, timestamps, actions within the app, and error reports to
          improve the Service.
        </li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>
          <strong>To operate the Service:</strong> Accessing Drive files to
          perform transcription, show results, and provide the app features
          you requested.
        </li>
        <li>
          <strong>To authenticate:</strong> Use Google sign-in to identify you
          and manage your session.
        </li>
      </ul>

      <h2>Data Sharing and Disclosure</h2>
      <p>We do not sell your personal information. We may share data with
      third-party service providers who perform services for us (hosting,
      analytics).</p>

      <h2>Contact</h2>
      <p>
        Developer contact email: <a href="mailto:meshachzakumi@gmail.com">support@transcrybeai.example</a>
      </p>

      <p>
        For verification: include this Privacy Policy URL in your OAuth consent
        screen and ensure the domain is verified in Google Search Console.
      </p>
    </div>
  );
}
