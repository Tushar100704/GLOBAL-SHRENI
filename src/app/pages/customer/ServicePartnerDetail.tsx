import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Star, MapPin, Clock, Phone, ShieldCheck, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Review, ServicePartner } from '../../types';
import { fetchPartnerById, fetchPartnerReviews } from '../../api/marketplaceApi';
import { callContact } from '../../utils/contact';

export function ServicePartnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<ServicePartner | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    Promise.all([fetchPartnerById(id), fetchPartnerReviews(id, 10)])
      .then(([partnerResponse, reviewsResponse]) => {
        if (!active) {
          return;
        }

        setPartner(partnerResponse);
        setReviews(reviewsResponse);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : 'Unable to load partner.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading partner...</div>;
  }

  if (!partner) {
    return <div className="p-6">{error || 'Partner not found.'}</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="relative h-48 bg-gradient-to-br from-primary to-accent">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img
          src={partner.image}
          alt={partner.name}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-32 h-32 rounded-2xl border-4 border-white shadow-xl object-cover"
        />
      </div>

      <div className="mt-20 px-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">{partner.name}</h1>
            {partner.verified && <ShieldCheck className="w-6 h-6 text-primary" />}
          </div>
          <p className="text-muted-foreground">{partner.category}</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{partner.rating}</span>
              <span className="text-sm text-muted-foreground">({partner.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{partner.distance} km</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{partner.eta} min</span>
            </div>
          </div>
          <Badge variant={partner.available ? 'default' : 'secondary'} className="mt-4">
            {partner.available ? 'Available Now' : 'Busy'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {partner.expertise.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>

        <p className="text-muted-foreground text-center mb-8">{partner.description}</p>

        <Tabs defaultValue="services" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-3 mt-4">
            {partner.services.map((service) => (
              <div
                key={service.id}
                className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-primary/10"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{service.name}</h3>
                  <span className="font-bold text-primary">INR {service.price}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {service.duration} min
                  </span>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/customer/booking/${partner.id}/${service.id}`)}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    Book Now
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4 mt-4">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl font-bold">{partner.rating}</span>
                    <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">Based on {partner.reviewCount} reviews</p>
                </div>
              </div>
            </div>

            {reviews.map((review) => (
              <div key={review.id} className="border rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={review.userImage}
                    alt={review.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{review.userName}</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`w-3 h-3 ${
                              index < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm mb-2">{review.comment}</p>
                <div className="flex flex-wrap gap-1">
                  {review.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="availability" className="mt-4">
            <div className="space-y-3">
              {partner.availability.map((day) => (
                <div key={day.date} className="border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold">{day.date}</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {day.slots.map((slot) => (
                      <button
                        key={slot}
                        className="bg-gradient-to-br from-blue-50 to-purple-50 border border-primary/20 rounded-lg px-3 py-2 text-sm hover:bg-primary hover:text-white transition-colors"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-md mx-auto">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => callContact(partner.name, partner.phone)}
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            onClick={() => navigate(`/customer/booking/${partner.id}/${partner.services[0].id}`)}
          >
            Book Service
          </Button>
        </div>
      </div>
    </div>
  );
}
