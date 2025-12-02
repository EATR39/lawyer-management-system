# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Dava Routes
Dava CRUD işlemleri endpoint'leri.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Case, Client, User
from app.utils.decorators import role_required

cases_bp = Blueprint('cases', __name__)


def generate_case_number():
    """Benzersiz dava numarası üretir"""
    year = datetime.utcnow().year
    last_case = Case.query.filter(
        Case.case_number.like(f'{year}/%')
    ).order_by(Case.id.desc()).first()
    
    if last_case:
        try:
            last_number = int(last_case.case_number.split('/')[1])
            new_number = last_number + 1
        except (ValueError, IndexError):
            new_number = 1
    else:
        new_number = 1
    
    return f'{year}/{str(new_number).zfill(4)}'


@cases_bp.route('', methods=['GET'])
@jwt_required()
def get_cases():
    """
    Dava listesi
    
    Query Parameters:
        page: Sayfa numarası
        per_page: Sayfa başına kayıt
        search: Arama terimi
        status: Durum filtresi
        case_type: Dava tipi filtresi
        client_id: Müvekkil filtresi
        lawyer_id: Avukat filtresi
        sort: Sıralama alanı
        order: Sıralama yönü
    
    Returns:
        cases: Dava listesi
        total: Toplam kayıt sayısı
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config['ITEMS_PER_PAGE'], type=int)
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    case_type = request.args.get('case_type', '')
    client_id = request.args.get('client_id', type=int)
    lawyer_id = request.args.get('lawyer_id', type=int)
    sort = request.args.get('sort', 'created_at')
    order = request.args.get('order', 'desc')
    
    # Temel sorgu
    query = Case.query
    
    # Arama filtresi
    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                Case.case_number.ilike(search_filter),
                Case.subject.ilike(search_filter),
                Case.court_name.ilike(search_filter),
                Case.opposing_party.ilike(search_filter)
            )
        )
    
    # Durum filtresi
    if status:
        query = query.filter(Case.status == status)
    
    # Dava tipi filtresi
    if case_type:
        query = query.filter(Case.case_type == case_type)
    
    # Müvekkil filtresi
    if client_id:
        query = query.filter(Case.client_id == client_id)
    
    # Avukat filtresi
    if lawyer_id:
        query = query.filter(Case.lawyer_id == lawyer_id)
    
    # Sıralama
    sort_column = getattr(Case, sort, Case.created_at)
    if order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Sayfalama
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'cases': [c.to_dict(include_relations=True) for c in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@cases_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_case(id):
    """
    Tek dava detayı
    """
    case = Case.query.get_or_404(id)
    return jsonify({
        'case': case.to_dict(include_relations=True)
    }), 200


@cases_bp.route('', methods=['POST'])
@jwt_required()
def create_case():
    """
    Yeni dava oluştur
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    # Gerekli alanları kontrol et
    if not data.get('client_id'):
        return jsonify({'message': 'Müvekkil seçimi gereklidir'}), 400
    if not data.get('case_type'):
        return jsonify({'message': 'Dava tipi gereklidir'}), 400
    if not data.get('subject'):
        return jsonify({'message': 'Dava konusu gereklidir'}), 400
    
    # Müvekkil kontrolü
    client = Client.query.get(data['client_id'])
    if not client:
        return jsonify({'message': 'Müvekkil bulunamadı'}), 404
    
    # Dava numarası oluştur
    case_number = data.get('case_number') or generate_case_number()
    
    # Dava numarası benzersizlik kontrolü
    existing = Case.query.filter_by(case_number=case_number).first()
    if existing:
        return jsonify({'message': 'Bu dava numarası zaten kayıtlı'}), 400
    
    # Dava oluştur
    case = Case(
        case_number=case_number,
        client_id=data['client_id'],
        lawyer_id=data.get('lawyer_id') or current_user_id,
        case_type=data['case_type'],
        court_name=data.get('court_name', '').strip() or None,
        subject=data['subject'].strip(),
        opposing_party=data.get('opposing_party', '').strip() or None,
        status=data.get('status', 'open'),
        notes=data.get('notes', '').strip() or None
    )
    
    # Tarihler
    if data.get('start_date'):
        try:
            case.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')).date()
        except ValueError:
            pass
    
    if data.get('next_hearing_date'):
        try:
            case.next_hearing_date = datetime.fromisoformat(data['next_hearing_date'].replace('Z', '+00:00'))
        except ValueError:
            pass
    
    # Dava değeri
    if data.get('case_value'):
        try:
            case.case_value = float(data['case_value'])
        except ValueError:
            pass
    
    db.session.add(case)
    db.session.commit()
    
    return jsonify({
        'message': 'Dava başarıyla oluşturuldu',
        'case': case.to_dict(include_relations=True)
    }), 201


@cases_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_case(id):
    """
    Dava güncelle
    """
    case = Case.query.get_or_404(id)
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    # Dava numarası kontrolü
    if 'case_number' in data and data['case_number'] != case.case_number:
        existing = Case.query.filter_by(case_number=data['case_number']).first()
        if existing:
            return jsonify({'message': 'Bu dava numarası zaten kayıtlı'}), 400
        case.case_number = data['case_number']
    
    # Alanları güncelle
    if 'client_id' in data:
        case.client_id = data['client_id']
    if 'lawyer_id' in data:
        case.lawyer_id = data['lawyer_id']
    if 'case_type' in data:
        case.case_type = data['case_type']
    if 'court_name' in data:
        case.court_name = data['court_name'].strip() or None
    if 'subject' in data:
        case.subject = data['subject'].strip()
    if 'opposing_party' in data:
        case.opposing_party = data['opposing_party'].strip() or None
    if 'status' in data:
        case.status = data['status']
    if 'notes' in data:
        case.notes = data['notes'].strip() or None
    
    # Tarihler
    if 'start_date' in data:
        if data['start_date']:
            try:
                case.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')).date()
            except ValueError:
                pass
        else:
            case.start_date = None
    
    if 'end_date' in data:
        if data['end_date']:
            try:
                case.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00')).date()
            except ValueError:
                pass
        else:
            case.end_date = None
    
    if 'next_hearing_date' in data:
        if data['next_hearing_date']:
            try:
                case.next_hearing_date = datetime.fromisoformat(data['next_hearing_date'].replace('Z', '+00:00'))
            except ValueError:
                pass
        else:
            case.next_hearing_date = None
    
    # Dava değeri
    if 'case_value' in data:
        if data['case_value']:
            try:
                case.case_value = float(data['case_value'])
            except ValueError:
                pass
        else:
            case.case_value = None
    
    db.session.commit()
    
    return jsonify({
        'message': 'Dava başarıyla güncellendi',
        'case': case.to_dict(include_relations=True)
    }), 200


@cases_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'lawyer'])
def delete_case(id):
    """
    Dava sil
    """
    case = Case.query.get_or_404(id)
    
    # İlişkili kayıtları kontrol et
    if case.transactions.count() > 0:
        return jsonify({'message': 'Bu davanın finansal işlemleri var, silinemez'}), 400
    
    db.session.delete(case)
    db.session.commit()
    
    return jsonify({'message': 'Dava başarıyla silindi'}), 200


@cases_bp.route('/types', methods=['GET'])
@jwt_required()
def get_case_types():
    """
    Dava tiplerini listele
    """
    return jsonify({
        'types': Case.CASE_TYPES
    }), 200


@cases_bp.route('/statuses', methods=['GET'])
@jwt_required()
def get_case_statuses():
    """
    Dava durumlarını listele
    """
    return jsonify({
        'statuses': Case.STATUSES
    }), 200
