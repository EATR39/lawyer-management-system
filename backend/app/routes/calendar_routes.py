# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Takvim Routes
Takvim etkinliği CRUD endpoint'leri.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app import db
from app.models import CalendarEvent
from app.utils.decorators import role_required

calendar_bp = Blueprint('calendar', __name__)


@calendar_bp.route('/events', methods=['GET'])
@jwt_required()
def get_events():
    """
    Etkinlik listesi
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config['ITEMS_PER_PAGE'], type=int)
    event_type = request.args.get('event_type', '')
    status = request.args.get('status', '')
    related_to = request.args.get('related_to', '')
    related_id = request.args.get('related_id', type=int)
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')
    
    query = CalendarEvent.query
    
    if event_type:
        query = query.filter(CalendarEvent.event_type == event_type)
    if status:
        query = query.filter(CalendarEvent.status == status)
    if related_to:
        query = query.filter(CalendarEvent.related_to == related_to)
    if related_id:
        query = query.filter(CalendarEvent.related_id == related_id)
    
    if start_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(CalendarEvent.start_datetime >= start)
        except ValueError:
            pass
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(CalendarEvent.start_datetime <= end)
        except ValueError:
            pass
    
    query = query.order_by(CalendarEvent.start_datetime.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'events': [e.to_dict(include_relations=True) for e in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@calendar_bp.route('/events/<int:id>', methods=['GET'])
@jwt_required()
def get_event(id):
    """
    Tek etkinlik detayı
    """
    event = CalendarEvent.query.get_or_404(id)
    return jsonify({
        'event': event.to_dict(include_relations=True)
    }), 200


@calendar_bp.route('/events', methods=['POST'])
@jwt_required()
def create_event():
    """
    Yeni etkinlik oluştur
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if not data.get('title'):
        return jsonify({'message': 'Başlık gereklidir'}), 400
    if not data.get('event_type'):
        return jsonify({'message': 'Etkinlik tipi gereklidir'}), 400
    if not data.get('start_datetime'):
        return jsonify({'message': 'Başlangıç tarihi gereklidir'}), 400
    
    event = CalendarEvent(
        title=data['title'].strip(),
        event_type=data['event_type'],
        location=data.get('location', '').strip() or None,
        related_to=data.get('related_to'),
        related_id=data.get('related_id'),
        reminder_time=data.get('reminder_time', 60),
        status=data.get('status', 'scheduled'),
        description=data.get('description', '').strip() or None,
        created_by=current_user_id
    )
    
    try:
        event.start_datetime = datetime.fromisoformat(data['start_datetime'].replace('Z', '+00:00'))
    except ValueError:
        return jsonify({'message': 'Geçersiz başlangıç tarihi formatı'}), 400
    
    if data.get('end_datetime'):
        try:
            event.end_datetime = datetime.fromisoformat(data['end_datetime'].replace('Z', '+00:00'))
        except ValueError:
            pass
    
    db.session.add(event)
    db.session.commit()
    
    return jsonify({
        'message': 'Etkinlik başarıyla oluşturuldu',
        'event': event.to_dict()
    }), 201


@calendar_bp.route('/events/<int:id>', methods=['PUT'])
@jwt_required()
def update_event(id):
    """
    Etkinlik güncelle
    """
    event = CalendarEvent.query.get_or_404(id)
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if 'title' in data:
        event.title = data['title'].strip()
    if 'event_type' in data:
        event.event_type = data['event_type']
    if 'location' in data:
        event.location = data['location'].strip() or None
    if 'related_to' in data:
        event.related_to = data['related_to']
    if 'related_id' in data:
        event.related_id = data['related_id']
    if 'reminder_time' in data:
        event.reminder_time = data['reminder_time']
    if 'status' in data:
        event.status = data['status']
    if 'description' in data:
        event.description = data['description'].strip() or None
    
    if 'start_datetime' in data:
        try:
            event.start_datetime = datetime.fromisoformat(data['start_datetime'].replace('Z', '+00:00'))
        except ValueError:
            pass
    
    if 'end_datetime' in data:
        if data['end_datetime']:
            try:
                event.end_datetime = datetime.fromisoformat(data['end_datetime'].replace('Z', '+00:00'))
            except ValueError:
                pass
        else:
            event.end_datetime = None
    
    db.session.commit()
    
    return jsonify({
        'message': 'Etkinlik başarıyla güncellendi',
        'event': event.to_dict()
    }), 200


@calendar_bp.route('/events/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'lawyer'])
def delete_event(id):
    """
    Etkinlik sil
    """
    event = CalendarEvent.query.get_or_404(id)
    db.session.delete(event)
    db.session.commit()
    
    return jsonify({'message': 'Etkinlik başarıyla silindi'}), 200


@calendar_bp.route('/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_events():
    """
    Yaklaşan etkinlikler (7 gün içinde)
    """
    days = request.args.get('days', 7, type=int)
    limit = request.args.get('limit', 10, type=int)
    
    now = datetime.utcnow()
    end_date = now + timedelta(days=days)
    
    events = CalendarEvent.query.filter(
        CalendarEvent.start_datetime >= now,
        CalendarEvent.start_datetime <= end_date,
        CalendarEvent.status == 'scheduled'
    ).order_by(CalendarEvent.start_datetime.asc()).limit(limit).all()
    
    return jsonify({
        'events': [e.to_dict(include_relations=True) for e in events]
    }), 200


@calendar_bp.route('/types', methods=['GET'])
@jwt_required()
def get_event_types():
    """
    Etkinlik tiplerini listele
    """
    return jsonify({
        'types': CalendarEvent.EVENT_TYPES
    }), 200


@calendar_bp.route('/statuses', methods=['GET'])
@jwt_required()
def get_event_statuses():
    """
    Etkinlik durumlarını listele
    """
    return jsonify({
        'statuses': CalendarEvent.STATUSES
    }), 200
