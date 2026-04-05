import { useEffect, useState } from 'react';
import { Star, TrendingUp, User, MessageSquare } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { fetchPartnerReviewsPanel, PartnerReviewsResponse, replyToReview } from '../../api/marketplaceApi';
import { getPartnerId } from '../../utils/session';
import { toast } from 'sonner';

export function PartnerReviews() {
  const [data, setData] = useState<PartnerReviewsResponse | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    fetchPartnerReviewsPanel(getPartnerId())
      .then((response) => {
        if (active) {
          setData(response);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load reviews.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      return;
    }

    try {
      const updatedReview = await replyToReview(getPartnerId(), reviewId, replyText.trim());
      setData((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          reviews: previous.reviews.map((review) => (review.id === reviewId ? updatedReview : review)),
        };
      });
      toast.success('Reply posted successfully.');
      setReplyTo(null);
      setReplyText('');
    } catch {
      toast.error('Unable to post reply.');
    }
  };

  if (loading) {
    return <div className="p-6">Loading reviews...</div>;
  }

  if (!data) {
    return <div className="p-6">{error || 'Reviews unavailable.'}</div>;
  }

  const { stats, reviews, ratingDistribution } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-6 shadow-lg">
        <h1 className="text-2xl font-bold">Reviews and Ratings</h1>
        <p className="text-sm text-white/80 mt-1">Manage your customer feedback</p>
      </div>

      <div className="px-6 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start gap-6 mb-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-2">
                <span className="text-3xl font-bold text-white">{stats.totalRating}</span>
              </div>
              <div className="flex items-center gap-1 justify-center mb-1">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`w-4 h-4 ${index < Math.floor(stats.totalRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{stats.totalReviews} reviews</p>
            </div>

            <div className="flex-1">
              <h3 className="font-semibold mb-3">Rating Distribution</h3>
              {ratingDistribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm">{item.stars}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{stats.completionRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <User className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold text-primary">{stats.totalReviews}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total Reviews</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Customer Reviews</h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <img src={review.userImage} alt={review.userName} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">{review.userName}</h4>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {[...Array(5)].map((_, index) => (
                        <Star
                          key={index}
                          className={`w-3 h-3 ${index < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm mb-3">{review.comment}</p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {review.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {review.photos && review.photos.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {review.photos.map((photo, index) => (
                      <img key={index} src={photo} alt="Review" className="w-20 h-20 rounded-lg object-cover" />
                    ))}
                  </div>
                )}

                {review.reply && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                    <p className="text-xs text-blue-700 font-semibold mb-1">Your Reply</p>
                    <p className="text-sm text-blue-800">{review.reply}</p>
                  </div>
                )}

                {replyTo === review.id ? (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 mt-3">
                    <Textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      placeholder="Write your reply..."
                      className="mb-2 bg-white border-0"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyTo(null);
                          setReplyText('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void handleReply(review.id)}
                        className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      >
                        Post Reply
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setReplyTo(review.id)}>
                    <MessageSquare className="w-4 h-4 mr-1" />
                    {review.reply ? 'Edit Reply' : 'Reply'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
}
