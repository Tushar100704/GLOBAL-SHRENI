import { Star, MapPin, Clock, Phone, ShieldCheck } from 'lucide-react';
import { ServicePartner } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router';
import { callContact } from '../utils/contact';

interface ServiceCardProps {
  partner: ServicePartner;
  compact?: boolean;
}

export function ServiceCard({ partner, compact = false }: ServiceCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
      <div className="flex gap-3">
        <img
          src={partner.image}
          alt={partner.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{partner.name}</h3>
                {partner.verified && (
                  <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{partner.category}</p>
            </div>
            <Badge variant={partner.available ? 'default' : 'secondary'} className="text-xs">
              {partner.available ? 'Available' : 'Busy'}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-2 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{partner.rating}</span>
              <span className="text-muted-foreground">({partner.reviewCount})</span>
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

          {!compact && (
            <>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {partner.description}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {partner.expertise.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/customer/partner/${partner.id}`)}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-3"
              onClick={() => callContact(partner.name, partner.phone)}
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              onClick={() => navigate(`/customer/partner/${partner.id}`)}
            >
              Book
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
