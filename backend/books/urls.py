from django.urls import path
from .views import (
    BookListCreateView, BookDetailView,
    TagListView, TagFollowView,
    BookshelfView,
    ReviewListView, UserReviewView,
    ReadingProgressView,
    NotificationListView, NotificationMarkReadView, NotificationSSEView,
    StatsView, UserStatsView,
    AnalyzePdfView, BookAnalysisView,
)
from .chat_views import BookChatView, RecommendationView

urlpatterns = [
    path('books/analyze-pdf/',                  AnalyzePdfView.as_view()),
    path('books/',                              BookListCreateView.as_view()),
    path('books/<int:pk>/',                     BookDetailView.as_view()),
    path('books/<int:pk>/analysis/',            BookAnalysisView.as_view()),
    path('books/<int:pk>/chat/',                BookChatView.as_view()),
    path('books/<int:pk>/shelf/',               BookshelfView.as_view()),
    path('books/<int:pk>/reviews/',             ReviewListView.as_view()),
    path('books/<int:pk>/my-review/',           UserReviewView.as_view()),
    path('books/<int:pk>/progress/',            ReadingProgressView.as_view()),
    path('tags/',                               TagListView.as_view()),
    path('tags/<int:pk>/follow/',               TagFollowView.as_view()),
    path('notifications/',                      NotificationListView.as_view()),
    path('notifications/stream/',               NotificationSSEView.as_view()),
    path('notifications/mark-read/',            NotificationMarkReadView.as_view()),
    path('admin/stats/',                        StatsView.as_view()),
    path('stats/me/',                           UserStatsView.as_view()),
    path('chat/recommend/',                     RecommendationView.as_view()),
]
