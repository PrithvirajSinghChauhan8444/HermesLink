import unittest
from core.classifier import categorize_download
from core.models import Job

class TestClassifier(unittest.TestCase):

    def test_applications(self):
        self.assertEqual(categorize_download("http://example.com/setup.exe", "aria2"), "Applications")
        self.assertEqual(categorize_download("http://example.com/app.dmg", "aria2"), "Applications")

    def test_documents(self):
        self.assertEqual(categorize_download("http://example.com/report.pdf", "aria2"), "Documents")

    def test_archives(self):
        self.assertEqual(categorize_download("http://example.com/backup.zip", "aria2"), "Archives")
        self.assertEqual(categorize_download("http://example.com/ubuntu.iso", "aria2"), "Archives")

    def test_images(self):
        self.assertEqual(categorize_download("http://example.com/photo.png", "aria2"), "Images")

    def test_videos_standard(self):
        self.assertEqual(categorize_download("http://example.com/video.mp4", "aria2"), "Videos")

    def test_videos_tv_show(self):
        # Should map to correct TV Show formatting
        self.assertEqual(
            categorize_download("http://example.com/Breaking.Bad.S02E05.720p.mkv", "aria2"), 
            "Videos/TV Shows/Breaking Bad/Season 2"
        )
        self.assertEqual(
            categorize_download("http://example.com/The_Office_s03e10.mp4", "aria2"), 
            "Videos/TV Shows/The Office/Season 3"
        )

    def test_media_engine_youtube_video(self):
        job = Job(engine_config={"format": "video"})
        self.assertEqual(categorize_download("https://www.youtube.com/watch?v=12345", "media", job), "YouTube/Video")

    def test_media_engine_youtube_audio(self):
        job = Job(engine_config={"format": "audio"})
        self.assertEqual(categorize_download("https://youtu.be/12345", "media", job), "YouTube/Audio")

    def test_media_engine_generic(self):
        job = Job(engine_config={"format": "video"})
        self.assertEqual(categorize_download("https://vimeo.com/12345", "media", job), "Media/Video")

    def test_others(self):
        self.assertEqual(categorize_download("http://localhost:59999/unknown_file.xyz", "aria2"), "Others")
        self.assertEqual(categorize_download("http://localhost:59999/", "aria2"), "Others")

if __name__ == "__main__":
    unittest.main()
